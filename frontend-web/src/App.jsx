import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import DriverFilterBar from "./components/DriverFilterBar";
import NotificationBell from "./components/NotificationBell";
import MobileWorkspace from "./components/MobileWorkspace";
import FleetSearchBar from "./components/fleetflow/FleetSearchBar";
import PeriodFilterBar from "./components/PeriodFilterBar";
import { useToast } from "./components/ToastProvider";
import useIsMobile from "./hooks/useIsMobile";
import AddLorryPage from "./pages/AddLorryPage";
import CreateTripPage from "./pages/CreateTripPage";
import DashboardPage from "./pages/DashboardPage";
import DoneTripsPage from "./pages/DoneTripsPage";
import DriverManagementPage from "./pages/DriverManagementPage";
import LiveTrackingPage from "./pages/LiveTrackingPage";
import LoginPage from "./pages/LoginPage";
import ProfitSummaryPage from "./pages/ProfitSummaryPage";
import ReportsPage from "./pages/ReportsPage";
import TripContactsPage from "./pages/TripContactsPage";
import MobileDashboardPage from "./pages/mobile/MobileDashboardPage";
import MobileDoneTripsPage from "./pages/mobile/MobileDoneTripsPage";
import MobileReportsPage from "./pages/mobile/MobileReportsPage";
import MobileTripContactsPage from "./pages/mobile/MobileTripContactsPage";
import MobileMorePage from "./pages/mobile/MobileMorePage";
import { formatMoney, languageToggleLabel, na, activeLabel, roleLabel } from "./utils/i18n";
import { parseApiDetail } from "./utils/parseApiError";
import { asFleetList, upsertFleetItem } from "./utils/fleetApiCore";
import {
  computeDashboardFromTrips,
  filterTripsByDriver,
  filterTripsByPeriod,
  getDriversInPeriod,
  getPeriodLabel
} from "./utils/periodFilter";
import { computeAssignmentPaySummary, computeDriverEarningsSummary } from "./utils/driverEarnings";
import { roundMoney } from "./utils/money";
import { commissionProgressText, commissionRuleText, stintCommissionTotal } from "./utils/commission";
import {
  buildDriverCreatePayload,
  driverCredentialClipboardText,
  validateDriverCreateForm
} from "./utils/driverCredentials";

const adminNavItems = [
  "Dashboard",
  "Done Trips",
  "Trip Contacts",
  "Profit",
  "Live Tracking",
  "Reports"
];

const userNavItems = [
  "Dashboard",
  "Add Lorry",
  "Drivers",
  "Create Trip",
  "Done Trips",
  "Trip Contacts",
  "Profit",
  "Live Tracking",
  "Reports"
];

const driverNavItems = ["Dashboard", "Create Trip", "Done Trips", "Trip Contacts"];

const adminMobileTabs = ["Dashboard", "Done", "Contacts", "More", "Reports"];
const userMobileTabs = ["Dashboard", "Done", "Contacts", "Trips", "Add", "More", "Reports"];
const driverMobileTabs = ["Dashboard", "Done", "Contacts", "Add", "Reports"];
const userActionPages = new Set(["Add Lorry", "Drivers", "Create Trip"]);
const userActionMobileTabs = new Set(["Trips", "Add"]);
const mobileFilterTabs = new Set(["Dashboard", "Done", "Contacts", "Reports", "Trips", "More"]);
const workspaceFilterPages = new Set(["Dashboard", "Done Trips", "Trip Contacts", "Reports", "Drivers"]);

const mobileTabLabels = {
  Dashboard: { en: "Home", te: "హోమ్" },
  Done: { en: "Done", te: "పూర్తి" },
  Contacts: { en: "Contacts", te: "కాంటాక్ట్" },
  Trips: { en: "Drivers", te: "డ్రైవర్" },
  Add: { en: "Add", te: "కొత్త" },
  More: { en: "More", te: "మరిన్ని" },
  Reports: { en: "Reports", te: "రిపోర్ట్" },
  Fleet: { en: "Fleet", te: "ఫ్లీట్" },
  "Trips Live": { en: "Trips Live", te: "లైవ్ ట్రిప్స్" },
  Drivers: { en: "Drivers", te: "డ్రైవర్లు" }
};

const mobileTabIcons = {
  Dashboard: "dashboard",
  Done: "done",
  Contacts: "contacts",
  Trips: "steering",
  Add: "add-box",
  More: "more",
  Reports: "reports"
};

const pageToMobileTab = {
  Dashboard: "Dashboard",
  "Done Trips": "Done",
  "Trip Contacts": "Contacts",
  "Create Trip": "Add",
  "Add Lorry": "Add",
  Drivers: "Trips",
  Reports: "Reports",
  Profit: "More",
  "Live Tracking": "More"
};

const mobileTabToPage = {
  Dashboard: "Dashboard",
  Done: "Done Trips",
  Contacts: "Trip Contacts",
  Trips: "Drivers",
  Add: "Create Trip",
  Reports: "Reports"
};

const mobileTabHints = {
  Dashboard: {
    en: "Overview of trips, profit, and fleet activity.",
    te: "ట్రిప్స్, లాభం మరియు ఫ్లీట్ స్థితి ఒక చూపులో."
  },
  Done: {
    en: "Review completed trips and delivery history.",
    te: "పూర్తైన ట్రిప్స్ మరియు డెలివరీ చరిత్ర చూడండి."
  },
  Contacts: {
    en: "Trip contacts and consignee details in one place.",
    te: "ట్రిప్ సంప్రదింపులు ఒకే చోట."
  },
  Trips: {
    en: "Manage drivers, assignments, and availability.",
    te: "డ్రైవర్లు, అసైన్‌మెంట్లు నిర్వహించండి."
  },
  Add: {
    en: "Register lorries or create a new trip with expenses.",
    te: "లారీ చేర్చండి లేదా కొత్త ట్రిప్ సృష్టించండి."
  },
  More: {
    en: "Profit summary, live tracking, and other fleet tools.",
    te: "లాభం సారాంశం, లైవ్ ట్రాకింగ్ మరియు ఇతర ఫ్లీట్ టూల్స్."
  },
  Reports: {
    en: "Business summaries and operational reports.",
    te: "వ్యాపార సారాంశాలు మరియు రిపోర్ట్స్."
  }
};
const LANGUAGE_STORAGE_KEY = "fleet_preferred_language";
const THEME_STORAGE_KEY = "fleet_theme";

const teluguLabels = {
  Dashboard: "డ్యాష్‌బోర్డ్",
  "Add Lorry": "లారీ చేర్చు",
  Drivers: "డ్రైవర్లు",
  "Create Trip": "ట్రిప్ సృష్టించు",
  "Done Trips": "పూర్తైన ట్రిప్స్",
  "Trip Contacts": "ట్రిప్ సంప్రదింపులు",
  Profit: "లాభం",
  "Live Tracking": "లైవ్ ట్రాకింగ్",
  Reports: "రిపోర్ట్స్",
  Login: "లాగిన్",
  "Fleet Admin": "ఫ్లీట్ అడ్మిన్",
  Admin: "అడ్మిన్",
  User: "యూజర్"
};

const navIcons = {
  Dashboard: "dashboard",
  "Add Lorry": "lorry",
  Drivers: "drivers",
  "Create Trip": "trip",
  "Done Trips": "done",
  "Trip Contacts": "contacts",
  Profit: "profit",
  "Live Tracking": "tracking",
  Reports: "reports"
};

const pageDescriptions = {
  Dashboard: "See live activity, profit, and vehicle movement at a glance.",
  "Add Lorry": "Register new vehicles and connect them to your active team.",
  Drivers: "Manage your drivers, assignments, and availability in one place.",
  "Create Trip": "Create a trip, record expenses, and dispatch faster.",
  "Done Trips": "Review completed trips, delivery history, and outcomes.",
  "Trip Contacts": "Keep every trip contact and consignee detail close at hand.",
  Profit: "Understand revenue, expenses, and trip-wise performance.",
  "Live Tracking": "Follow route progress and know which fleet is moving now.",
  Reports: "Scan business summaries and operational reports quickly."
};

function getGreeting(language = "en") {
  const hour = new Date().getHours();
  if (hour < 12) return language === "te" ? "శుభోదయం" : "Good morning";
  if (hour < 17) return language === "te" ? "శుభ మధ్యాహ్నం" : "Good afternoon";
  return language === "te" ? "శుభ సాయంత్రం" : "Good evening";
}

const initialTrip = {
  lorry_id: "",
  driver_id: "",
  load_type: "",
  load_location: "",
  unload_location: "",
  contact_person_name: "",
  contact_person_phone: "",
  loading_date: "",
  unloading_date: "",
  load_price: "",
  status: "Loading",
  diesel: "",
  toll: "",
  driver_bata: "",
  driver_daily_rate: "",
  driver_daily_wage: "",
  driver_commission_percent: "6",
  driver_commission_amount: "",
  puncture: "",
  repair: "",
  other_expense: "",
  proof_images: []
};

export default function App() {
  const showToast = useToast();
  const workspaceScrollRef = useRef(null);
  const profileTriggerRef = useRef(null);
  const profilePopoverRef = useRef(null);
  const [activePage, setActivePage] = useState("Dashboard");
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "en";
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return storedLanguage === "te" ? "te" : "en";
  });
  const [dashboard, setDashboard] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [lorries, setLorries] = useState([]);
  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedDriverHistory, setSelectedDriverHistory] = useState(null);
  const [selectedLorryHistory, setSelectedLorryHistory] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 860;
  });
  const [driverAssignments, setDriverAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    lorry_id: "",
    driver_id: "",
    assigned_at: "",
    daily_wage: "",
    commission_percent: "6",
    notes: ""
  });
  const [newDriver, setNewDriver] = useState({
    name: "",
    phone: "",
    license_number: "",
    login_identifier: "",
    password: ""
  });
  const [lastDriverCreated, setLastDriverCreated] = useState(null);
  const [driverSaveError, setDriverSaveError] = useState("");
  const [newLorry, setNewLorry] = useState({
    vehicle_number: "",
    lorry_type: "Open Body",
    driver_id: "",
    assigned_at: ""
  });
  const [newTrip, setNewTrip] = useState(initialTrip);
  const [authUser, setAuthUser] = useState(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    profile_image_url: "",
    preferred_language: "en"
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [scopeUsers, setScopeUsers] = useState([]);
  const [selectedScopeUser, setSelectedScopeUser] = useState("");
  const [activeMobileTab, setActiveMobileTab] = useState("Dashboard");
  const [mobileMoreSubview, setMobileMoreSubview] = useState(null);
  const [mobileAddMode, setMobileAddMode] = useState("fleet");
  const [periodFilter, setPeriodFilter] = useState("complete");
  const [driverFilterId, setDriverFilterId] = useState("");
  const [fleetSearch, setFleetSearch] = useState("");
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  });
  const isMobile = useIsMobile();
  const confirmResolverRef = useRef(null);
  const dataFetchGenerationRef = useRef(0);

  const authQuery = useMemo(() => {
    if (!authUser) return null;
    const query = { viewer: authUser.identifier, role: authUser.role };
    if (authUser.role === "admin" && selectedScopeUser) {
      query.scope_user = selectedScopeUser;
    }
    return query;
  }, [authUser, selectedScopeUser]);

  function openConfirmDialog(message) {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmDialog({ message });
    });
  }

  function closeConfirmDialog(confirmed) {
    const resolver = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmDialog(null);
    if (resolver) resolver(Boolean(confirmed));
  }

  async function loadNotifications() {
    // Notifications API is intentionally disabled for now.
    // Re-enable api.getNotifications(authQuery) when notification module is finalized.
    setNotifications([]);
  }

  async function loadData() {
    if (!authQuery) return;

    const generation = ++dataFetchGenerationRef.current;
    const query = authQuery;
    setIsDataLoading(true);

    try {
      const [dashboardRes, driversRes, lorriesRes, tripsRes, expensesRes, assignmentsRes] =
        await Promise.allSettled([
          api.getDashboard(query),
          api.getDrivers(query),
          api.getLorries(query),
          api.getTrips(query),
          api.getExpenses(query),
          api.getDriverAssignments(query)
        ]);

      if (generation !== dataFetchGenerationRef.current) {
        return;
      }

      if (dashboardRes.status === "fulfilled" && dashboardRes.value != null) {
        setDashboard(dashboardRes.value);
      }
      if (driversRes.status === "fulfilled") {
        setDrivers(asFleetList(driversRes.value));
      }
      if (lorriesRes.status === "fulfilled") {
        setLorries(asFleetList(lorriesRes.value));
      }
      if (tripsRes.status === "fulfilled") {
        setTrips(asFleetList(tripsRes.value));
      }
      if (expensesRes.status === "fulfilled") {
        setExpenses(asFleetList(expensesRes.value));
      }
      if (assignmentsRes.status === "fulfilled") {
        setDriverAssignments(asFleetList(assignmentsRes.value));
      }

      // Notifications API disabled for now to avoid polling traffic.
      setNotifications([]);
    } finally {
      if (generation === dataFetchGenerationRef.current) {
        setIsDataLoading(false);
      }
    }
  }

  const expenseTotalsByTrip = expenses.reduce((acc, item) => {
    const current = acc[item.trip_id] || {
      diesel: 0,
      toll: 0,
      driver_bata: 0,
      driver_daily_wage: 0,
      driver_commission_amount: 0,
      maintenance: 0,
      other: 0
    };
    current.diesel = roundMoney(current.diesel + Number(item.diesel || 0));
    current.toll = roundMoney(current.toll + Number(item.toll || 0));
    current.driver_bata = roundMoney(current.driver_bata + Number(item.driver_bata || 0));
    current.driver_daily_wage = roundMoney(current.driver_daily_wage + Number(item.driver_daily_wage || 0));
    current.driver_commission_amount = roundMoney(current.driver_commission_amount + Number(item.driver_commission_amount || 0));
    current.maintenance = roundMoney(current.maintenance + Number(item.maintenance || 0));
    current.other = roundMoney(current.other + Number(item.other || 0));
    acc[item.trip_id] = current;
    return acc;
  }, {});

  const periodTrips = useMemo(() => filterTripsByPeriod(trips, periodFilter), [trips, periodFilter]);
  const driversForFilter = useMemo(() => {
    const fromPeriod = getDriversInPeriod(drivers, trips, periodFilter);
    return fromPeriod.length ? fromPeriod : drivers;
  }, [drivers, trips, periodFilter]);
  const driverTripCounts = useMemo(() => {
    const counts = {};
    periodTrips.forEach((trip) => {
      if (trip.driver_id) {
        counts[trip.driver_id] = (counts[trip.driver_id] || 0) + 1;
      }
    });
    return counts;
  }, [periodTrips]);
  const filteredTrips = useMemo(
    () => filterTripsByDriver(periodTrips, driverFilterId),
    [periodTrips, driverFilterId]
  );
  const filteredDashboard = useMemo(
    () => computeDashboardFromTrips(filteredTrips, lorries, drivers),
    [filteredTrips, lorries, drivers]
  );
  const driverEarningsSummary = useMemo(
    () => computeDriverEarningsSummary(filteredTrips, expenseTotalsByTrip),
    [filteredTrips, expenseTotalsByTrip]
  );
  const filteredAssignments = useMemo(() => {
    if (!driverFilterId) return driverAssignments;
    return driverAssignments.filter((item) => String(item.driver_id) === String(driverFilterId));
  }, [driverAssignments, driverFilterId]);
  const filteredDrivers = useMemo(() => {
    if (!driverFilterId) return drivers;
    return drivers.filter((driver) => String(driver.id) === String(driverFilterId));
  }, [drivers, driverFilterId]);
  const selectedDriverStintPay = useMemo(() => {
    if (!selectedDriver) return null;
    return computeAssignmentPaySummary(driverAssignments, { driverId: selectedDriver.id });
  }, [selectedDriver, driverAssignments]);
  const selectedDriverHistoryDerived = useMemo(() => {
    if (!selectedDriverHistory) return null;
    const trips = selectedDriverHistory.trips || [];
    const storedTotalCommission = Number(selectedDriverHistory.total_commission_amount || 0);
    const transportTotal = Number(selectedDriverHistory.total_transport_amount || 0);
    const commissionPercent = Number(
      selectedDriverStintPay?.currentStint?.commission_percent
        ?? selectedDriverStintPay?.latest?.commission_percent
        ?? 6
    );
    const expectedCommissionTotal = stintCommissionTotal(transportTotal, commissionPercent);
    const needsFallbackAllocation = storedTotalCommission <= 0 && expectedCommissionTotal > 0 && transportTotal > 0;

    let effectiveTotalCommission = 0;
    const normalizedTrips = trips.map((trip) => {
      const tripTransport = Number(trip.transport_amount ?? trip.load_price ?? 0);
      const storedCommission = Number(trip.commission_amount || 0);
      const fallbackCommission = needsFallbackAllocation
        ? roundMoney(expectedCommissionTotal * (tripTransport / transportTotal))
        : 0;
      const effectiveCommission = storedCommission > 0 ? storedCommission : fallbackCommission;
      const effectiveEarning = roundMoney(
        Number(trip.trip_total_earning ?? trip.driver_earned ?? 0) + (effectiveCommission - storedCommission)
      );
      effectiveTotalCommission = roundMoney(effectiveTotalCommission + effectiveCommission);
      return {
        ...trip,
        effective_commission_amount: effectiveCommission,
        effective_trip_total_earning: effectiveEarning,
        effective_commission_eligible: effectiveCommission > 0 || Boolean(trip.commission_eligible)
      };
    });

    const baseEarningWithoutCommission = roundMoney(
      Number(selectedDriverHistory.total_driver_earning || 0) - storedTotalCommission
    );
    const effectiveTotalEarning = roundMoney(baseEarningWithoutCommission + effectiveTotalCommission);

    return {
      trips: normalizedTrips,
      effectiveTotalCommission,
      effectiveTotalEarning
    };
  }, [selectedDriverHistory, selectedDriverStintPay]);

  useEffect(() => {
    if (!authUser || authUser.role !== "admin") {
      setScopeUsers([]);
      setSelectedScopeUser("");
      return;
    }
    api
      .getUsers({ viewer: authUser.identifier, role: "admin" })
      .then((users) => {
        const list = users || [];
        setScopeUsers(list);
        setSelectedScopeUser((current) => {
          if (current && list.some((user) => user.identifier === current)) {
            return current;
          }
          return list[0]?.identifier || "";
        });
      })
      .catch(console.error);
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    if (authUser.role === "admin" && !selectedScopeUser) {
      setDashboard({
        total_lorries: 0,
        total_drivers: 0,
        running_trips: 0,
        total_income: 0,
        total_expenses: 0,
        total_profit: 0
      });
      setDrivers([]);
      setLorries([]);
      setTrips([]);
      setExpenses([]);
      setDriverAssignments([]);
      return;
    }
    loadData().catch(console.error);
  }, [authUser, selectedScopeUser]);

  useEffect(() => {
    // Notifications polling disabled for now.
    // Keep state cleared so UI does not request /notifications.
    setNotifications([]);
    return () => {};
  }, [authQuery?.role, authQuery?.scope_user, authQuery?.viewer]);

  async function saveDriver() {
    if (authUser?.role !== "user") return;
    setDriverSaveError("");
    const { payload, loginId, password } = buildDriverCreatePayload(newDriver);
    const validationMsg = validateDriverCreateForm(
      { loginId, password, name: payload.name, phone: payload.phone },
      language
    );
    if (validationMsg) {
      setDriverSaveError(validationMsg);
      showToast(validationMsg, "error");
      return;
    }
    if (loginId.length >= 3) {
      try {
        const check = await api.checkUserId(loginId);
        if (!check.available) {
          const msg = check.message || (language === "te" ? "లాగిన్ ID ఇప్పటికే ఉంది" : "Login ID already exists");
          setDriverSaveError(msg);
          showToast(msg, "error");
          return;
        }
      } catch {
        /* server will validate */
      }
    }
    try {
      const created = await api.createDriver(payload, authQuery);
      setLastDriverCreated(created);
      if (created?.id) {
        setDrivers((prev) => upsertFleetItem(prev, created));
      }
      setNewDriver({ name: "", phone: "", license_number: "", login_identifier: "", password: "" });
      setDriverSaveError("");
      await loadData();
      const creds = driverCredentialClipboardText(created, language);
      showToast(
        language === "te"
          ? `${created.name} సేవ్ అయ్యారు. డ్రైవర్ లాగిన్ సృష్టించబడింది — డ్రైవర్ ట్యాబ్‌లో లాగిన్ అవ్వండి.`
          : `${created.name} saved. Driver login created — sign in on the Driver tab.`,
        "success"
      );
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(creds).catch(() => {});
      }
    } catch (error) {
      const msg = parseApiDetail(
        error,
        language === "te" ? "డ్రైవర్ సేవ్ విఫలమైంది." : "Failed to save driver."
      );
      setDriverSaveError(msg);
      showToast(msg, "error");
    }
  }

  async function toggleDriverStatus(driver) {
    if (authUser?.role !== "user") return;
    try {
      await api.updateDriverStatus(driver.id, !driver.is_active, authQuery);
      if (selectedDriver?.id === driver.id) {
        await openDriverDetail({ ...driver, is_active: !driver.is_active });
      }
      await loadData();
      showToast(
        driver.is_active
          ? language === "te"
            ? `${driver.name} నిలిపివేయబడింది.`
            : `${driver.name} disabled.`
          : language === "te"
            ? `${driver.name} యాక్టివ్ చేయబడింది.`
            : `${driver.name} enabled.`,
        "success"
      );
    } catch (error) {
      showToast(
        parseApiDetail(error, language === "te" ? "డ్రైవర్ స్థితి మార్చడం విఫలమైంది." : "Failed to update driver status."),
        "error"
      );
    }
  }

  async function deleteDriver(driver) {
    if (authUser?.role !== "user") return;
    const confirmMsg =
      language === "te"
        ? `${driver.name} ను తొలగించాలా? లైవ్ ట్రిప్‌లతో సహా ఈ డ్రైవర్ ట్రిప్ చరిత్ర, అసైన్‌మెంట్లు మరియు లాగిన్ కూడా తొలగించబడతాయి.`
        : `Delete ${driver.name}? Their live trips, trip history, assignments, and login will also be removed.`;
    if (!(await openConfirmDialog(confirmMsg))) return;
    try {
      await api.deleteDriver(driver.id, authQuery);
      if (selectedDriver?.id === driver.id) {
        closeDriverDetail();
      }
      await loadData();
      showToast(
        language === "te" ? `${driver.name} తొలగించబడింది.` : `${driver.name} deleted.`,
        "success"
      );
    } catch (error) {
      const msg = parseApiDetail(
        error,
        language === "te" ? "డ్రైవర్ తొలగింపు విఫలమైంది." : "Failed to delete driver."
      );
      showToast(msg, "error");
    }
  }

  async function saveLorry(e) {
    e.preventDefault();
    if (authUser?.role !== "user") return;
    const vehicleNumber = (newLorry.vehicle_number || "").trim().toUpperCase();
    if (!vehicleNumber) {
      showToast(
        language === "te" ? "వాహన నంబర్ అవసరం." : "Vehicle number is required.",
        "error"
      );
      return;
    }
    try {
      const created = await api.createLorry(
        {
          vehicle_number: vehicleNumber,
          current_location: "",
          driver_id: null
        },
        authQuery
      );
      if (created?.id) {
        setLorries((prev) => upsertFleetItem(prev, created));
      }
      if (created?.id && newLorry.driver_id) {
        await api.createDriverAssignment(
          {
            driver_id: Number(newLorry.driver_id),
            lorry_id: created.id,
            assigned_at: newLorry.assigned_at || null
          },
          authQuery
        );
      }
      setNewLorry({ vehicle_number: "", lorry_type: "Open Body", driver_id: "", assigned_at: "" });
      await loadData();
      showToast(
        language === "te" ? "లారీ విజయవంతంగా సేవ్ అయింది." : "Lorry saved successfully.",
        "success"
      );
    } catch (error) {
      const msg = parseApiDetail(
        error,
        language === "te" ? "లారీ సేవ్ విఫలమైంది." : "Failed to save lorry."
      );
      showToast(msg, "error");
    }
  }

  async function deleteLorry(lorry) {
    if (authUser?.role !== "user") return;
    const confirmMsg =
      language === "te"
        ? `${lorry.vehicle_number} లారీని తొలగించాలా? దీనికి సంబంధించిన ట్రిప్ చరిత్ర కూడా తొలగించబడుతుంది.`
        : `Delete lorry ${lorry.vehicle_number}? Related trip history will also be removed.`;
    if (!(await openConfirmDialog(confirmMsg))) return;
    try {
      await api.deleteLorry(lorry.id, authQuery);
      if (selectedLorryHistory?.lorry_id === lorry.id) {
        setSelectedLorryHistory(null);
      }
      await loadData();
      showToast(
        language === "te"
          ? `${lorry.vehicle_number} తొలగించబడింది.`
          : `Lorry ${lorry.vehicle_number} deleted.`,
        "success"
      );
    } catch (error) {
      const msg = parseApiDetail(
        error,
        language === "te" ? "లారీ తొలగింపు విఫలమైంది." : "Failed to delete lorry."
      );
      showToast(msg, "error");
    }
  }

  async function toggleLorryStatus(lorry) {
    if (authUser?.role !== "user") return;
    try {
      await api.updateLorryStatus(lorry.id, !lorry.is_active, authQuery);
      if (selectedLorryHistory?.lorry_id === lorry.id) {
        const latest = await api.getLorryHistory(lorry.id, authQuery);
        setSelectedLorryHistory(latest);
      }
      await loadData();
      showToast(
        lorry.is_active
          ? language === "te"
            ? `${lorry.vehicle_number} నిలిపివేయబడింది.`
            : `${lorry.vehicle_number} disabled.`
          : language === "te"
            ? `${lorry.vehicle_number} యాక్టివ్ చేయబడింది.`
            : `${lorry.vehicle_number} enabled.`,
        "success"
      );
    } catch (error) {
      showToast(
        parseApiDetail(error, language === "te" ? "లారీ స్థితి మార్చడం విఫలమైంది." : "Failed to update lorry status."),
        "error"
      );
    }
  }

  async function openDriverDetail(driver) {
    setSelectedDriver(driver);
    setSelectedDriverHistory(null);
    const history = await api.getDriverHistory(driver.id, authQuery);
    setSelectedDriverHistory(history);
  }

  function closeDriverDetail() {
    setSelectedDriver(null);
    setSelectedDriverHistory(null);
  }

  async function openLorryHistory(lorry) {
    const history = await api.getLorryHistory(lorry.id, authQuery);
    setSelectedLorryHistory(history);
  }

  async function saveTrip(e) {
    e.preventDefault();
    if (authUser?.role !== "user" && authUser?.role !== "driver") return;
    const driverId =
      authUser?.role === "driver" ? Number(authUser.driver_id) : Number(newTrip.driver_id);
    try {
      const createdTrip = await api.createTrip(
        {
          ...newTrip,
          lorry_id: Number(newTrip.lorry_id),
          driver_id: driverId,
          loading_date: newTrip.loading_date || null,
          unloading_date: newTrip.unloading_date || null,
          load_price: Number(newTrip.load_price)
        },
        authQuery
      );
      await api.createExpense(
        {
          trip_id: Number(createdTrip.id),
          diesel: roundMoney(newTrip.diesel),
          toll: roundMoney(newTrip.toll),
          driver_bata: roundMoney(newTrip.driver_bata),
          driver_daily_wage: roundMoney(newTrip.driver_daily_wage),
          driver_commission_percent: roundMoney(newTrip.driver_commission_percent),
          driver_commission_amount: roundMoney(newTrip.driver_commission_amount),
          maintenance: roundMoney(roundMoney(newTrip.puncture) + roundMoney(newTrip.repair)),
          other: roundMoney(newTrip.other_expense),
          proof_images: newTrip.proof_images || []
        },
        authQuery
      );
      if (createdTrip?.id) {
        setTrips((prev) => upsertFleetItem(prev, createdTrip));
      }
      setNewTrip({
        ...initialTrip,
        driver_id: authUser?.role === "driver" ? String(authUser.driver_id || "") : ""
      });
      await loadData();
      showToast(
        language === "te" ? "ట్రిప్ విజయవంతంగా సేవ్ అయింది." : "Trip saved successfully.",
        "success"
      );
    } catch (error) {
      showToast(
        parseApiDetail(
          error,
          language === "te" ? "ట్రిప్ సేవ్ విఫలమైంది." : "Failed to save trip."
        ),
        "error"
      );
    }
  }

  async function updateTrip(tripId, payload) {
    try {
      await api.updateTrip(tripId, payload, authQuery);
      await loadData();
      showToast(
        language === "te" ? "ట్రిప్ అప్డేట్ అయింది." : "Trip updated successfully.",
        "success"
      );
    } catch (error) {
      showToast(
        parseApiDetail(error, language === "te" ? "ట్రిప్ అప్డేట్ విఫలమైంది." : "Failed to update trip."),
        "error"
      );
      throw error;
    }
  }

  async function loginAsUser(targetIdentifier) {
    if (!authUser || authUser.role !== "admin" || !targetIdentifier) return;
    try {
      localStorage.setItem("fleet_admin_backup", JSON.stringify(authUser));
      const userSession = await api.loginAsUser(
        { target_identifier: targetIdentifier },
        { viewer: authUser.identifier, role: "admin" }
      );
      setAuthUser(userSession);
      localStorage.setItem("fleet_auth_user", JSON.stringify(userSession));
      setSelectedScopeUser("");
      const existingProfile = await api.getUserProfile(userSession.identifier);
      setProfile(existingProfile);
      setActivePage("Dashboard");
      showToast(
        language === "te" ? `${userSession.identifier} గా లాగిన్ అయ్యారు.` : `Logged in as ${userSession.identifier}.`,
        "success"
      );
    } catch (error) {
      showToast(error.message || "Could not login as user", "error");
    }
  }

  function exitImpersonation() {
    const backup = localStorage.getItem("fleet_admin_backup");
    if (!backup) return;
    const adminSession = JSON.parse(backup);
    setAuthUser(adminSession);
    localStorage.setItem("fleet_auth_user", JSON.stringify(adminSession));
    localStorage.removeItem("fleet_admin_backup");
    setProfile(null);
    setActivePage("Dashboard");
    showToast(language === "te" ? "అడ్మిన్ వీక్షణకు తిరిగి వచ్చారు." : "Back to admin view.", "success");
  }

  async function assignDriverToLorry() {
    if (authUser?.role !== "user") return;
    if (!assignmentForm.driver_id || !assignmentForm.lorry_id) return;
    try {
      await api.createDriverAssignment(
        {
          driver_id: Number(assignmentForm.driver_id),
          lorry_id: Number(assignmentForm.lorry_id),
          assigned_at: assignmentForm.assigned_at || null,
          daily_wage: Number(assignmentForm.daily_wage || 0),
          commission_percent: Number(assignmentForm.commission_percent || 0),
          notes: assignmentForm.notes || null
        },
        authQuery
      );
      setAssignmentForm({
        lorry_id: "",
        driver_id: "",
        assigned_at: "",
        daily_wage: "",
        commission_percent: "6",
        notes: ""
      });
      await loadData();
      showToast(
        language === "te" ? "డ్రైవర్ కేటాయింపు విజయవంతం." : "Driver assigned successfully.",
        "success"
      );
    } catch (error) {
      showToast(
        parseApiDetail(error, language === "te" ? "కేటాయింపు విఫలమైంది." : "Failed to assign driver."),
        "error"
      );
    }
  }

  async function completeAssignment(assignmentId, payload = {}) {
    if (authUser?.role !== "user") return;
    try {
      await api.completeDriverAssignment(assignmentId, payload, authQuery);
      await loadData();
      showToast(
        language === "te" ? "కేటాయింపు పూర్తయింది." : "Assignment completed.",
        "success"
      );
    } catch (error) {
      showToast(
        parseApiDetail(error, language === "te" ? "కేటాయింపు పూర్తి చేయడం విఫలమైంది." : "Failed to complete assignment."),
        "error"
      );
    }
  }

  async function addAssignmentLeave(assignmentId, payload) {
    if (authUser?.role !== "user") return;
    try {
      await api.addDriverAssignmentLeave(assignmentId, payload, authQuery);
      await loadData();
      showToast(language === "te" ? "సెలవు జోడించబడింది." : "Leave added.", "success");
    } catch (error) {
      showToast(
        parseApiDetail(error, language === "te" ? "సెలవు జోడించడం విఫలమైంది." : "Failed to add leave."),
        "error"
      );
    }
  }

  async function acceptDriverAssignment(assignmentId) {
    if (authUser?.role !== "driver") return;
    try {
      await api.acceptDriverAssignment(assignmentId, authQuery);
      await loadData();
      showToast(language === "te" ? "కేటాయింపు అంగీకరించబడింది." : "Assignment accepted.", "success");
    } catch (error) {
      showToast(
        parseApiDetail(error, language === "te" ? "కేటాయింపు అంగీకరించడం విఫలమైంది." : "Failed to accept assignment."),
        "error"
      );
    }
  }

  function redirectFromNotification(notification) {
    if (!notification) return;
    const relatedType = String(notification.related_type || "").toLowerCase();
    const text = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();

    if (relatedType === "trip" || text.includes("trip")) {
      goToPage("Done Trips");
      return;
    }

    if (relatedType === "driver" || relatedType === "assignment" || text.includes("driver") || text.includes("assignment")) {
      if (authUser?.role === "driver") {
        goToPage("Dashboard");
      } else {
        goToPage("Drivers");
      }
      return;
    }

    if (relatedType === "lorry" || text.includes("lorry")) {
      goToPage("Add Lorry");
      return;
    }

    goToPage("Dashboard");
  }

  async function markNotificationRead(notification) {
    if (!notification) return;
    if (!notification.is_read) {
      await api.markNotificationRead(notification.id, authQuery);
      await loadData();
    }
    setShowNotifications(false);
    redirectFromNotification(notification);
  }

  async function markAllNotificationsRead() {
    await api.markAllNotificationsRead(authQuery);
    await loadData();
  }

  async function clearAllNotifications() {
    if (!notifications.length) return;
    const confirmMsg =
      language === "te"
        ? "అన్ని నోటిఫికేషన్లను తొలగించాలా?"
        : "Clear all notifications?";
    if (!(await openConfirmDialog(confirmMsg))) return;
    try {
      await api.clearAllNotifications(authQuery);
      setShowNotifications(false);
      await loadData();
      showToast(
        language === "te" ? "నోటిఫికేషన్లు తొలగించబడ్డాయి." : "Notifications cleared.",
        "success"
      );
    } catch (error) {
      showToast(
        parseApiDetail(
          error,
          language === "te"
            ? "నోటిఫికేషన్లు తొలగించలేకపోయాం. బ్యాకెండ్ రీస్టార్ట్ చేయండి."
            : "Could not clear notifications. Restart the backend server."
        ),
        "error"
      );
    }
  }

  async function updateAssignment(assignmentId, payload) {
    if (authUser?.role !== "user") return;
    try {
      await api.updateDriverAssignment(assignmentId, payload, authQuery);
      await loadData();
      showToast(language === "te" ? "కేటాయింపు అప్డేట్ అయింది." : "Assignment updated.", "success");
    } catch (error) {
      showToast(
        parseApiDetail(error, language === "te" ? "కేటాయింపు అప్డేట్ విఫలమైంది." : "Failed to update assignment."),
        "error"
      );
    }
  }

  async function handleLogin(payload) {
    try {
      setIsLoggingIn(true);
      setLoginError("");
      setLoginNotice("");
      const normalizedId = (payload?.identifier ?? loginForm.identifier ?? "").trim().toLowerCase();
      const user = await api.login({
        identifier: normalizedId,
        password: payload?.password ?? loginForm.password
      });

      const loginAs = payload?.loginAs;
      if (loginAs === "driver" && user.role !== "driver") {
        setLoginError(
          language === "te"
            ? "ఇది డ్రైవర్ అకౌంట్ కాదు. డ్రైవర్ ట్యాబ్‌లో డ్రైవర్ ID ఉపయోగించండి."
            : "This is not a driver account. Use Driver tab with your Driver ID."
        );
        return;
      }
      if (loginAs === "user" && user.role !== "user") {
        setLoginError(
          language === "te"
            ? "ఇది యూజర్ అకౌంట్ కాదు. సరైన ట్యాబ్ ఎంచుకోండి."
            : "This is not a fleet user account. Choose the correct tab."
        );
        return;
      }
      if (loginAs === "loader" && user.role !== "user") {
        setLoginError(
          language === "te"
            ? "లోడర్ లాగిన్ కోసం యజమాని ఇచ్చిన లోడర్ ID ఉపయోగించండి."
            : "Use the Loader ID from your fleet owner (user-type account)."
        );
        return;
      }

      setAuthUser(user);
      localStorage.setItem("fleet_auth_user", JSON.stringify(user));
      if (user.role === "driver" && user.driver_id) {
        setNewTrip((prev) => ({ ...prev, driver_id: String(user.driver_id) }));
      }
      const existingProfile = await api.getUserProfile(user.identifier);
      setProfile(existingProfile);
      if (existingProfile) {
        const preferredLanguage = existingProfile.preferred_language || "en";
        setLanguage(preferredLanguage);
        setProfileForm({
          full_name: existingProfile.full_name || "",
          phone: existingProfile.phone || "",
          email: existingProfile.email || "",
          profile_image_url: existingProfile.profile_image_url || "",
          preferred_language: preferredLanguage
        });
      }
      payload?.onDone?.();
      setActivePage("Dashboard");
      setActiveMobileTab("Dashboard");
      showToast(
        language === "te" ? `స్వాగతం, ${user.identifier}!` : `Welcome, ${user.identifier}!`,
        "success"
      );
    } catch (error) {
      setLoginError(
        parseApiDetail(error, language === "te" ? "లాగిన్ విఫలమైంది" : "Invalid username or password")
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleRegisterUser(payload) {
    try {
      if ((payload.password || "") !== (payload.confirm_password || "")) {
        setLoginError(language === "te" ? "పాస్‌వర్డ్‌లు సరిపోలలేదు" : "Passwords do not match");
        return;
      }
      const created = await api.registerUser({
        identifier: (payload.identifier || "").trim().toLowerCase(),
        phone: payload.phone,
        email: payload.email,
        preferred_language: payload.preferred_language || language || "en",
        password: payload.password,
        confirm_password: payload.confirm_password
      });
      const accountType = payload?.accountType || "user";
      setLoginForm({ identifier: created.identifier, password: "" });
      setLoginError("");
      if (accountType === "loader") {
        setLoginNotice(
          language === "te"
            ? `లోడర్ అకౌంట్ సృష్టించబడింది. లోడర్ ట్యాబ్‌లో ID: ${created.identifier} తో లాగిన్ అవ్వండి.`
            : `Loader account created. Sign in on the Loader tab with ID: ${created.identifier}`
        );
      } else {
        setLoginNotice(
          language === "te"
            ? `అకౌంట్ సృష్టించబడింది. మీ యూజర్ ID: ${created.identifier}`
            : `Account created. Your User ID: ${created.identifier}`
        );
      }
      payload?.onDone?.();
      showToast(
        language === "te"
          ? `అకౌంట్ సృష్టించబడింది: ${created.identifier}`
          : `Account created: ${created.identifier}`,
        "success"
      );
    } catch (error) {
      setLoginError(
        parseApiDetail(error, language === "te" ? "నమోదు విఫలమైంది" : "Registration failed")
      );
    }
  }

  async function handleForgotPassword(identifier, newPassword, onDone) {
    try {
      await api.forgotPassword({ identifier, new_password: newPassword });
      showToast(language === "te" ? "పాస్‌వర్డ్ విజయవంతంగా రీసెట్ అయింది." : "Password reset successful.", "success");
      onDone?.();
    } catch (error) {
      showToast(error.message || "Password reset failed", "error");
    }
  }

  function handleLogout() {
    if (authUser?.acting_as_admin) {
      exitImpersonation();
      return;
    }
    setAuthUser(null);
    setScopeUsers([]);
    setSelectedScopeUser("");
    localStorage.removeItem("fleet_auth_user");
    localStorage.removeItem("fleet_admin_backup");
    setDashboard(null);
    setDrivers([]);
    setLorries([]);
    setTrips([]);
    setExpenses([]);
    setDriverAssignments([]);
    setProfile(null);
    setProfileForm({ full_name: "", phone: "", email: "", profile_image_url: "", preferred_language: "en" });
    setShowProfilePanel(false);
    setIsEditingProfile(false);
    setSelectedDriver(null);
    setSelectedDriverHistory(null);
    setSelectedLorryHistory(null);
  }

  async function saveProfile() {
    if (!authUser || !profileForm.full_name) return;
    try {
      setIsSavingProfile(true);
      const saved = await api.saveUserProfile({
        identifier: authUser.identifier,
        role: authUser.role,
        full_name: profileForm.full_name,
        phone: profileForm.phone || null,
        email: profileForm.email || null,
        profile_image_url: profileForm.profile_image_url || null,
        preferred_language: profileForm.preferred_language || language || "en"
      });
      setProfile(saved);
      setLanguage(saved.preferred_language || profileForm.preferred_language || "en");
      setIsEditingProfile(false);
      showToast(language === "te" ? "ప్రొఫైల్ సేవ్ అయింది." : "Profile saved.", "success");
    } catch (error) {
      showToast(
        parseApiDetail(error, language === "te" ? "ప్రొఫైల్ సేవ్ విఫలమైంది." : "Failed to save profile."),
        "error"
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  function renderPeriodDriverFilters() {
    if (authUser?.role === "admin" && !selectedScopeUser) return null;

    const showFilters = isMobile
      ? mobileFilterTabs.has(activeMobileTab) && activeMobileTab !== "Add"
      : workspaceFilterPages.has(activePage);

    if (!showFilters) return null;

    return (
      <div className={isMobile ? "m-filters-wrap" : "workspace-filters-wrap m-filters-wrap"}>
        <PeriodFilterBar value={periodFilter} onChange={setPeriodFilter} language={language} />
        {authUser?.role === "driver" ? null : (
          <DriverFilterBar
            drivers={driversForFilter.length ? driversForFilter : drivers}
            value={driverFilterId}
            onChange={setDriverFilterId}
            language={language}
            tripCounts={driverTripCounts}
          />
        )}
      </div>
    );
  }

  function renderMobilePage() {
    if (authUser?.role === "admin" && !selectedScopeUser) {
      return (
        <div className="mu-page">
          <div className="mu-empty">
            <p className="mu-empty-title">{language === "te" ? "యూజర్‌ను ఎంచుకోండి" : "Select a user"}</p>
            <p className="mu-empty-text">
              {language === "te"
                ? "పైన ఉన్న యూజర్ బటన్‌ను ఎంచుకుంటే ఆ యూజర్ డేటా మాత్రమే చూపబడుతుంది."
                : "Choose a user above to view only that user's fleet data."}
            </p>
          </div>
        </div>
      );
    }

    if (authUser?.role === "admin" && userActionMobileTabs.has(activeMobileTab)) {
      return (
        <div className="mu-page">
          <div className="mu-empty">
            <p className="mu-empty-title">{language === "te" ? "అనుమతి లేదు" : "Access restricted"}</p>
            <p className="mu-empty-text">
              {language === "te"
                ? "ఈ భాగం యూజర్ చర్యల కోసం మాత్రమే అందుబాటులో ఉంటుంది."
                : "This section is available for user operations only."}
            </p>
          </div>
        </div>
      );
    }

    if (activeMobileTab === "Trips") {
      return (
        <div className="mu-form-shell">
        <DriverManagementPage
          drivers={filteredDrivers.length ? filteredDrivers : drivers}
          lorries={lorries}
          assignments={filteredAssignments}
          form={newDriver}
          setForm={(next) => {
            setNewDriver(next);
            if (driverSaveError) setDriverSaveError("");
          }}
          saveError={driverSaveError}
          onSubmit={saveDriver}
          onSelect={openDriverDetail}
          assignmentForm={assignmentForm}
          setAssignmentForm={setAssignmentForm}
          onAssign={assignDriverToLorry}
          onAddAssignmentLeave={addAssignmentLeave}
          onCompleteAssignment={completeAssignment}
          onToggleDriverStatus={toggleDriverStatus}
          onDeleteDriver={deleteDriver}
          language={language}
          lastCreated={lastDriverCreated}
          onDismissCreated={() => setLastDriverCreated(null)}
          currentLoginIdentifier={authUser?.identifier}
        />
        </div>
      );
    }

    if (activeMobileTab === "Reports") {
      return (
        <MobileReportsPage
          dashboard={filteredDashboard}
          trips={filteredTrips}
          language={language}
          periodFilter={periodFilter}
          userRole={authUser?.role}
          expenseTotalsByTrip={expenseTotalsByTrip}
          notifications={notifications}
          onClearAllNotifications={clearAllNotifications}
        />
      );
    }

    if (activeMobileTab === "Done") {
      return (
        <MobileDoneTripsPage
          trips={filteredTrips}
          drivers={drivers}
          lorries={lorries}
          language={language}
          expenseTotalsByTrip={expenseTotalsByTrip}
          periodFilter={periodFilter}
          userRole={authUser?.role}
          onUpdateTrip={updateTrip}
        />
      );
    }

    if (activeMobileTab === "Contacts") {
      return (
        <MobileTripContactsPage
          trips={filteredTrips}
          drivers={drivers}
          language={language}
          periodFilter={periodFilter}
        />
      );
    }

    if (activeMobileTab === "More" && authUser?.role !== "driver") {
      return (
        <MobileMorePage
          subview={mobileMoreSubview}
          onSubviewChange={setMobileMoreSubview}
          dashboard={filteredDashboard}
          trips={filteredTrips}
          language={language}
          periodFilter={periodFilter}
        />
      );
    }

    if (activeMobileTab === "Add") {
      if (authUser?.role === "driver") {
        return (
          <div className="mu-form-shell">
          <CreateTripPage
            form={newTrip}
            setForm={setNewTrip}
            lorries={lorries}
            drivers={drivers}
            onSubmit={saveTrip}
            language={language}
            lockedDriverId={authUser.driver_id}
          />
          </div>
        );
      }
      return (
        <div className="mu-form-shell">
          <div className="mu-segment-bar" role="tablist" aria-label={language === "te" ? "కొత్త ఎంపిక" : "Add options"}>
            <button
              type="button"
              role="tab"
              aria-selected={mobileAddMode === "fleet"}
              className={`mu-segment-btn ${mobileAddMode === "fleet" ? "active" : ""}`}
              onClick={() => setMobileAddMode("fleet")}
            >
              {language === "te" ? "లారీలు" : "Fleet"}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileAddMode === "trip"}
              className={`mu-segment-btn ${mobileAddMode === "trip" ? "active" : ""}`}
              onClick={() => setMobileAddMode("trip")}
            >
              {language === "te" ? "కొత్త ట్రిప్" : "New Trip"}
            </button>
          </div>
          {mobileAddMode === "fleet" ? (
            <AddLorryPage
              form={newLorry}
              setForm={setNewLorry}
              drivers={drivers}
              lorries={lorries}
              assignments={driverAssignments}
              selectedLorryHistory={selectedLorryHistory}
              onSelectLorry={openLorryHistory}
              onToggleLorryStatus={toggleLorryStatus}
              onDeleteLorry={deleteLorry}
              onUpdateAssignment={updateAssignment}
              onSubmit={saveLorry}
              language={language}
              compact
            />
          ) : (
            <CreateTripPage
              form={newTrip}
              setForm={setNewTrip}
              lorries={lorries}
              drivers={drivers}
              onSubmit={saveTrip}
              language={language}
            />
          )}
        </div>
      );
    }

    return (
      <MobileDashboardPage
        dashboard={filteredDashboard}
        trips={filteredTrips}
        drivers={driversForFilter.length ? driversForFilter : drivers}
        lorries={lorries}
        language={language}
        expenseTotalsByTrip={expenseTotalsByTrip}
        periodFilter={periodFilter}
        userName={profileForm.full_name || profile?.full_name || authUser?.identifier}
        userRole={authUser?.role}
        driverAssignments={driverAssignments}
        driverId={authUser?.driver_id}
        onAcceptAssignment={acceptDriverAssignment}
        onUpdateTrip={updateTrip}
        onAddTrip={authUser?.role === "user" ? () => goToPage("Create Trip") : undefined}
        onAddExpense={authUser?.role === "user" ? () => goToPage("Create Trip") : undefined}
        isLoading={isDataLoading}
        searchQuery={fleetSearch}
      />
    );
  }

  function renderPage() {
    if (authUser?.role === "admin" && !selectedScopeUser) {
      return (
        <section className="panel">
          <h2>{language === "te" ? "యూజర్‌ను ఎంచుకోండి" : "Select a user"}</h2>
          <p className="muted">
            {language === "te"
              ? "పైన ఉన్న డ్రాప్‌డౌన్ నుండి యూజర్‌ను ఎంచుకుంటే ఆ యూజర్ డేటా మాత్రమే చూపబడుతుంది."
              : "Pick a user from the dropdown above to view only that user's fleet data."}
          </p>
        </section>
      );
    }

    if (authUser?.role === "admin" && userActionPages.has(activePage)) {
      return (
        <section className="panel">
          <h2>{language === "te" ? "అనుమతి లేదు" : "Access restricted"}</h2>
          <p className="muted">
            {language === "te"
              ? "ఈ పేజీ యూజర్ చర్యల కోసం మాత్రమే అందుబాటులో ఉంటుంది."
              : "This page is available for User actions only."}
          </p>
        </section>
      );
    }

    if (activePage === "Add Lorry") {
      return (
        <AddLorryPage
          form={newLorry}
          setForm={setNewLorry}
          drivers={drivers}
          lorries={lorries}
          assignments={driverAssignments}
          selectedLorryHistory={selectedLorryHistory}
          onSelectLorry={openLorryHistory}
          onToggleLorryStatus={toggleLorryStatus}
          onDeleteLorry={deleteLorry}
          onUpdateAssignment={updateAssignment}
          onSubmit={saveLorry}
          language={language}
        />
      );
    }

    if (activePage === "Drivers") {
      return (
        <>
          <DriverManagementPage
            drivers={filteredDrivers.length ? filteredDrivers : drivers}
            lorries={lorries}
            assignments={filteredAssignments}
            form={newDriver}
            setForm={(next) => {
              setNewDriver(next);
              if (driverSaveError) setDriverSaveError("");
            }}
            saveError={driverSaveError}
            onSubmit={saveDriver}
            onSelect={openDriverDetail}
            assignmentForm={assignmentForm}
            setAssignmentForm={setAssignmentForm}
            onAssign={assignDriverToLorry}
            onAddAssignmentLeave={addAssignmentLeave}
            onCompleteAssignment={completeAssignment}
            onToggleDriverStatus={toggleDriverStatus}
            onDeleteDriver={deleteDriver}
            language={language}
            lastCreated={lastDriverCreated}
            onDismissCreated={() => setLastDriverCreated(null)}
            currentLoginIdentifier={authUser?.identifier}
          />
        </>
      );
    }

    if (activePage === "Create Trip") {
      return (
        <CreateTripPage
          form={newTrip}
          setForm={setNewTrip}
          lorries={lorries}
          drivers={drivers}
          onSubmit={saveTrip}
          language={language}
          lockedDriverId={authUser?.role === "driver" ? authUser.driver_id : null}
        />
      );
    }

    if (activePage === "Done Trips") {
      return (
        <DoneTripsPage
          trips={filteredTrips}
          drivers={drivers}
          lorries={lorries}
          language={language}
          expenseTotalsByTrip={expenseTotalsByTrip}
          periodFilter={periodFilter}
          userRole={authUser?.role}
          onUpdateTrip={updateTrip}
          searchQuery={fleetSearch}
        />
      );
    }

    if (activePage === "Trip Contacts") {
      return <TripContactsPage trips={filteredTrips} drivers={drivers} language={language} periodFilter={periodFilter} />;
    }

    if (activePage === "Profit") {
      return <ProfitSummaryPage trips={filteredTrips} language={language} />;
    }

    if (activePage === "Live Tracking") {
      return <LiveTrackingPage language={language} />;
    }

    if (activePage === "Reports") {
      return <ReportsPage dashboard={filteredDashboard} trips={filteredTrips} language={language} periodFilter={periodFilter} />;
    }

    return (
      <DashboardPage
        dashboard={filteredDashboard}
        trips={filteredTrips}
        drivers={driversForFilter.length ? driversForFilter : drivers}
        lorries={lorries}
        onAddTrip={() => goToPage("Create Trip")}
        onAddExpense={() => goToPage("Create Trip")}
        language={language}
        expenseTotalsByTrip={expenseTotalsByTrip}
        onUpdateTrip={updateTrip}
        periodFilter={periodFilter}
        userName={profileForm.full_name || profile?.full_name || authUser?.identifier}
        userRole={authUser?.role}
        driverAssignments={driverAssignments}
        driverId={authUser?.driver_id}
        onAcceptAssignment={acceptDriverAssignment}
        isLoading={isDataLoading}
        searchQuery={fleetSearch}
      />
    );
  }

  const t = (key) => (language === "te" ? teluguLabels[key] || key : key);
  const tMobileTab = (key) => {
    const label = mobileTabLabels[key];
    if (!label) return key;
    return language === "te" ? label.te : label.en;
  };
  const mobileTabs =
    authUser?.role === "admin"
      ? adminMobileTabs
      : authUser?.role === "driver"
        ? driverMobileTabs
        : userMobileTabs;
  const navItems =
    authUser?.role === "admin"
      ? adminNavItems
      : authUser?.role === "driver"
        ? driverNavItems
        : userNavItems;
  const mobileNavItems =
    authUser?.role === "admin"
      ? ["Dashboard", "Done Trips", "Reports"]
      : authUser?.role === "driver"
        ? ["Dashboard", "Create Trip", "Done Trips"]
        : ["Create Trip", "Add Lorry", "Trip Contacts"];
  const desktopActiveTripCount = trips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done").length;
  const mobileHeaderDate = new Date().toLocaleDateString(language === "te" ? "te-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
  const workspaceMetrics =
    authUser?.role === "driver"
      ? [
          { label: language === "te" ? "నా ట్రిప్స్" : "My Trips", value: driverEarningsSummary.tripCount },
          { label: language === "te" ? "సంపాదన" : "Earnings", value: `Rs ${driverEarningsSummary.totalEarning.toFixed(0)}` },
          { label: language === "te" ? "లైవ్" : "Live", value: driverEarningsSummary.activeTripCount }
        ]
      : [
          { label: "Fleet", value: dashboard?.total_lorries ?? lorries.length },
          { label: "Trips Live", value: desktopActiveTripCount },
          { label: "Drivers", value: drivers.length }
        ];
  const workspaceDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const pageDescription =
    authUser?.role === "driver" && (activePage === "Dashboard" || activeMobileTab === "Dashboard")
      ? language === "te"
        ? "ఎంచుకున్న కాలంలో మీ ట్రిప్ సంపాదనను చూడండి."
        : "See your trip earnings for the selected period."
      : pageDescriptions[activePage] || "Stay on top of fleet operations from a single workspace.";
  const userDisplayName = profile?.full_name || authUser?.identifier || "User";
  const profileInitial = userDisplayName.charAt(0).toUpperCase();
  const profileImageUrl = profile?.profile_image_url || profileForm.profile_image_url || "";
  const showUserNotifications =
    authUser?.role === "user" || (authUser?.role === "admin" && selectedScopeUser);
  const unreadNotificationCount = notifications.filter((item) => !item.is_read).length;

  async function handleProfileImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Image read failed"));
      reader.readAsDataURL(file);
    });
    setProfileForm((prev) => ({ ...prev, profile_image_url: dataUrl }));
    event.target.value = "";
  }

  async function handleLanguageToggle() {
    const nextLanguage = language === "en" ? "te" : "en";
    setLanguage(nextLanguage);
    setProfileForm((prev) => ({ ...prev, preferred_language: nextLanguage }));
    if (!authUser || !profile?.full_name) return;
    try {
      const saved = await api.saveUserProfile({
        identifier: authUser.identifier,
        role: authUser.role,
        full_name: profile.full_name,
        phone: profile.phone || null,
        email: profile.email || null,
        profile_image_url: profile.profile_image_url || null,
        preferred_language: nextLanguage
      });
      setProfile(saved);
    } catch (_error) {
      // Keep UI updated locally even if API save fails.
    }
  }

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  function goToPage(page) {
    setActivePage(page);
    if (page === "Create Trip") {
      setMobileAddMode("trip");
    } else if (page === "Add Lorry") {
      setMobileAddMode("fleet");
    }
    if (page === "Profit") {
      setActiveMobileTab("More");
      setMobileMoreSubview("profit");
    } else if (page === "Live Tracking") {
      setActiveMobileTab("More");
      setMobileMoreSubview("tracking");
    } else {
      const mobileTab = pageToMobileTab[page];
      if (mobileTab) {
        setActiveMobileTab(mobileTab);
      }
      setMobileMoreSubview(null);
    }
    if (typeof window !== "undefined" && window.innerWidth <= 860) {
      setIsSidebarOpen(false);
    }
  }

  function goToMobileTab(tab) {
    setActiveMobileTab(tab);
    if (tab === "More") {
      setMobileMoreSubview(null);
      return;
    }
    setMobileMoreSubview(null);
    if (tab === "Add") {
      setMobileAddMode("fleet");
    }
    const page = mobileTabToPage[tab];
    if (page) {
      setActivePage(page);
    }
  }

  function toggleMobileMenu() {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      if (next && typeof window !== "undefined" && window.innerWidth <= 860) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return next;
    });
  }

  useEffect(() => {
    if (!isMobile) return;
    const mobileTab = pageToMobileTab[activePage];
    if (mobileTab && mobileTab !== activeMobileTab) {
      setActiveMobileTab(mobileTab);
    }
  }, [isMobile, activePage]);

  useEffect(() => {
    if (authUser?.role === "admin" && userActionPages.has(activePage)) {
      setActivePage("Dashboard");
    }
  }, [activePage, authUser]);

  useEffect(() => {
    if (authUser?.role === "admin" && userActionMobileTabs.has(activeMobileTab)) {
      setActiveMobileTab("Dashboard");
    }
  }, [activeMobileTab, authUser]);

  useEffect(() => {
    setDriverFilterId("");
  }, [selectedScopeUser]);

  useEffect(() => {
    if (activeMobileTab !== "Trips") {
      closeDriverDetail();
    }
  }, [activeMobileTab]);

  useEffect(() => {
    if (activePage !== "Drivers") {
      closeDriverDetail();
    }
  }, [activePage]);

  useEffect(() => {
    const scrollHost =
      workspaceScrollRef.current ||
      (typeof document !== "undefined"
        ? document.querySelector(isMobile ? ".mobile-app-shell" : ".workspace-shell")
        : null);
    if (scrollHost && typeof scrollHost.scrollTo === "function") {
      scrollHost.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activePage, activeMobileTab, isMobile]);

  useEffect(() => {
    let active = true;

    async function bootstrapSession() {
      try {
        const stored = localStorage.getItem("fleet_auth_user");
        if (!stored) {
          return;
        }

        let parsedUser;
        try {
          parsedUser = JSON.parse(stored);
        } catch (_error) {
          localStorage.removeItem("fleet_auth_user");
          return;
        }

        if (!active) {
          return;
        }

        setAuthUser(parsedUser);

        try {
          const existingProfile = await api.getUserProfile(parsedUser.identifier);
          if (!active) {
            return;
          }

          setProfile(existingProfile);
          if (existingProfile) {
            const preferredLanguage = existingProfile.preferred_language || "en";
            setLanguage(preferredLanguage);
            setProfileForm({
              full_name: existingProfile.full_name || "",
              phone: existingProfile.phone || "",
              email: existingProfile.email || "",
              profile_image_url: existingProfile.profile_image_url || "",
              preferred_language: preferredLanguage
            });
          }
        } catch (_error) {
          // Continue without profile; login/profile setup screens handle the rest.
        }
      } catch (_error) {
        localStorage.removeItem("fleet_auth_user");
        if (active) {
          setAuthUser(null);
          setProfile(null);
        }
      } finally {
        setIsSessionReady(true);
      }
    }

    bootstrapSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!showProfilePanel) return;

    function handlePointerDown(event) {
      const target = event.target;
      if (profileTriggerRef.current?.contains(target)) return;
      if (profilePopoverRef.current?.contains(target)) return;
      setShowProfilePanel(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [showProfilePanel]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  if (!isSessionReady) {
    return (
      <main className="main auth-shell">
        <div className="startup-loader">
          <span className="startup-loader-spinner" aria-hidden="true" />
          <p className="muted">{language === "te" ? "లోడ్ అవుతోంది..." : "Loading workspace..."}</p>
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className={`main auth-shell ${isMobile ? "auth-shell-mobile" : ""}`}>
        <LoginPage
          language={language}
          form={loginForm}
          setForm={setLoginForm}
          onLogin={handleLogin}
          onRegister={handleRegisterUser}
          onForgotPassword={handleForgotPassword}
          loading={isLoggingIn}
          error={loginError}
          notice={loginNotice}
          isMobile={isMobile}
        />
      </main>
    );
  }

  const needsProfileSetup =
    (authUser.role === "user" || authUser.role === "driver") && !profile?.full_name?.trim();

  function openProfilePanel() {
    setShowProfilePanel(true);
    if (needsProfileSetup) {
      setIsEditingProfile(true);
    }
  }

  const profileIncompleteDot = needsProfileSetup ? (
    <span className="profile-incomplete-dot" aria-hidden="true" title={language === "te" ? "ప్రొఫైల్ పూర్తి చేయండి" : "Complete your profile"} />
  ) : null;

  const driverDetailModal = selectedDriver ? (
    <div
      className="driver-detail-modal-overlay"
      role="button"
      tabIndex={0}
      onClick={closeDriverDetail}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "Enter" || event.key === " ") closeDriverDetail();
      }}
    >
      <section className="driver-detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="driver-detail-modal-head">
          <h3>{language === "te" ? "డ్రైవర్ వివరాలు" : "Driver Detail"}</h3>
          <div className="driver-detail-modal-actions">
            {authUser?.role === "user" ? (
              <button
                type="button"
                className="ghost driver-delete-btn"
                onClick={() => deleteDriver(selectedDriver)}
              >
                {language === "te" ? "తొలగించు" : "Delete"}
              </button>
            ) : null}
            <button type="button" className="ghost driver-detail-close-btn" onClick={closeDriverDetail}>
              {language === "te" ? "మూసివేయి" : "Close"}
            </button>
          </div>
        </div>
        <p className="section-kicker" style={{ marginTop: 8 }}>
          {language === "te" ? "డ్రైవర్ ప్రొఫైల్" : "DRIVER PROFILE"}
        </p>
        <p>{language === "te" ? "పేరు" : "Name"}: {selectedDriver.name}</p>
        <p>{language === "te" ? "ఫోన్" : "Phone"}: {selectedDriver.phone}</p>
        <p>{language === "te" ? "లైసెన్స్" : "License"}: {selectedDriver.license_number || na(language)}</p>
        <p>{language === "te" ? "స్థితి" : "Status"}: {activeLabel(language, selectedDriver.is_active)}</p>
        {selectedDriverStintPay?.currentStint ? (
          <div className="assignment-highlight-card" style={{ marginTop: 12 }}>
            <h4>{language === "te" ? "ప్రస్తుత పని చెల్లింపు" : "Current Stint Pay"}</h4>
            <p>
              {language === "te" ? "ఈ కాలం రోజులు" : "Stint days"}: {selectedDriverStintPay.totalWorkingDays} ·{" "}
              {language === "te" ? "చెల్లింపు" : "Pay"}: {formatMoney(language, selectedDriverStintPay.totalEarning)}
            </p>
            <p className="muted">
              {language === "te"
                ? "గ్యాప్ రోజులు చెల్లింపులో లేవు. పాత కాలాలు క్రింద చరిత్రలో."
                : "Gap days are not paid. Past stints stay in history only."}
            </p>
            <p className="muted">{commissionRuleText(language)}</p>
            {selectedDriverStintPay.currentStint?.total_transport_amount != null ? (
              <p className="muted">
                {commissionProgressText(selectedDriverStintPay.currentStint.total_transport_amount, language)}
              </p>
            ) : null}
          </div>
        ) : null}
        {selectedDriverHistory ? (
          <>
            <p>{language === "te" ? "మొత్తం ట్రిప్స్" : "Total Trips"}: {selectedDriverHistory.total_trips}</p>
            <p>{language === "te" ? "మొత్తం పని రోజులు" : "Total Working Days"}: {selectedDriverHistory.total_working_days || 0}</p>
            <p>{language === "te" ? "మొత్తం ట్రాన్స్‌పోర్ట్ మొత్తం" : "Total Transport Amount"}: {formatMoney(language, selectedDriverHistory.total_transport_amount)}</p>
            <p>
              {language === "te" ? "మొత్తం కమిషన్" : "Total Commission"}:{" "}
              {formatMoney(language, selectedDriverHistoryDerived?.effectiveTotalCommission ?? selectedDriverHistory.total_commission_amount)}
            </p>
            <p className="muted">{commissionRuleText(language)}</p>
            <p>
              {language === "te" ? "మొత్తం సంపాదన" : "Total Earning"}:{" "}
              {formatMoney(language, selectedDriverHistoryDerived?.effectiveTotalEarning ?? selectedDriverHistory.total_driver_earning)}
            </p>
            <h4 style={{ margin: "12px 0 8px" }}>
              {language === "te" ? "ఇటీవలి ట్రిప్ లెడ్జర్" : "Recent Trip Ledger"}
            </h4>
            <div className="cards-list">
              {(selectedDriverHistoryDerived?.trips || selectedDriverHistory.trips || []).map((trip) => (
                <div className="mini-card" key={trip.trip_id}>
                  <p>#{trip.trip_id} - {trip.route}</p>
                  <p>{language === "te" ? "లారీ" : "Lorry"}: {trip.lorry_number || trip.lorry_id}</p>
                  <p>{language === "te" ? "పని రోజులు" : "Working Days"}: {trip.working_days || 0}</p>
                  <p>{language === "te" ? "ట్రాన్స్‌పోర్ట్ మొత్తం" : "Transport Amount"}: {formatMoney(language, trip.transport_amount ?? trip.load_price)}</p>
                  <p>{language === "te" ? "కమిషన్" : "Commission"}: {formatMoney(language, trip.effective_commission_amount ?? trip.commission_amount)}</p>
                  {!trip.effective_commission_eligible && !trip.commission_eligible ? (
                    <p className="muted" style={{ fontSize: 12 }}>
                      {commissionProgressText(selectedDriverHistory.total_transport_amount, language)}
                    </p>
                  ) : null}
                  <p>
                    {language === "te" ? "ట్రిప్ మొత్తం సంపాదన" : "Trip Total Earning"}:{" "}
                    {formatMoney(language, trip.effective_trip_total_earning ?? trip.trip_total_earning ?? trip.driver_earned)}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">{language === "te" ? "లోడ్ అవుతోంది..." : "Loading..."}</p>
        )}
      </section>
    </div>
  ) : null;

  const profilePanel = showProfilePanel ? (
    <div
      className={isMobile ? "m-profile-overlay" : "profile-menu-layer"}
      role="presentation"
      onClick={() => setShowProfilePanel(false)}
    >
      <div
        className={`top-profile-popover profile-menu-card ${isMobile ? "m-profile-sheet" : ""}`}
        ref={profilePopoverRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="top-profile-head">
          <div className="top-profile-logo">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={userDisplayName} className="avatar-img" />
            ) : (
              profileInitial
            )}
          </div>
          <div>
            <strong>{userDisplayName}</strong>
            <p className="muted" style={{ margin: "2px 0 0" }}>
              {authUser.identifier} · {roleLabel(language, authUser.role)}
            </p>
          </div>
        </div>

        {needsProfileSetup ? (
          <p className="profile-setup-inline-note">
            {language === "te"
              ? "మీ ప్రొఫైల్‌ను ఇక్కడే సృష్టించండి. పేరు తప్పనిసరి."
              : "Create your profile here. Name is required."}
          </p>
        ) : null}

        {isEditingProfile || needsProfileSetup ? (
          <div className="form-grid single profile-menu-form" style={{ marginTop: 10 }}>
            <input
              placeholder={language === "te" ? "పూర్తి పేరు" : "Full Name"}
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
            />
            <input
              placeholder={language === "te" ? "ఫోన్ నంబర్" : "Phone Number"}
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
            <input
              placeholder={language === "te" ? "ఇమెయిల్" : "Email"}
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
            <select
              value={profileForm.preferred_language || "en"}
              onChange={(e) => {
                setProfileForm({ ...profileForm, preferred_language: e.target.value });
                setLanguage(e.target.value);
              }}
            >
              <option value="en">{language === "te" ? "ఇంగ్లీష్" : "English"}</option>
              <option value="te">{language === "te" ? "తెలుగు" : "Telugu"}</option>
            </select>
            <label className="muted" style={{ fontSize: 12 }}>
              {language === "te" ? "ప్రొఫైల్ చిత్రం" : "Profile Image"}
            </label>
            <input type="file" accept="image/*" onChange={handleProfileImageUpload} />
          </div>
        ) : (
          <div className="top-profile-meta profile-menu-meta">
            <p>{language === "te" ? "ఫోన్" : "Phone"}: {profile?.phone || "-"}</p>
            <p>{language === "te" ? "ఇమెయిల్" : "Email"}: {profile?.email || "-"}</p>
            {isMobile ? (
              <p>
                {language === "te" ? "కాలం" : "Period"}: {getPeriodLabel(periodFilter, language)} · {filteredTrips.length}{" "}
                {language === "te" ? "ట్రిప్స్" : "trips"}
              </p>
            ) : null}
          </div>
        )}

        {isEditingProfile || needsProfileSetup ? (
          <div className="profile-menu-actions">
            <button type="button" className="profile-menu-item" onClick={saveProfile} disabled={isSavingProfile || !profileForm.full_name}>
              {isSavingProfile
                ? language === "te"
                  ? "సేవ్ అవుతోంది..."
                  : "Saving..."
                : needsProfileSetup
                  ? language === "te"
                    ? "ప్రొఫైల్ సేవ్"
                    : "Save Profile"
                  : language === "te"
                    ? "సేవ్ చేయి"
                    : "Save changes"}
            </button>
            {!needsProfileSetup ? (
              <button type="button" className="profile-menu-item profile-menu-item--ghost" onClick={() => setIsEditingProfile(false)}>
                {language === "te" ? "రద్దు" : "Cancel"}
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="profile-menu-divider" />
            <div className="profile-menu-list">
              <button type="button" className="profile-menu-item" onClick={() => setIsEditingProfile(true)}>
                <span className="profile-menu-item-icon" aria-hidden="true">✎</span>
                <span>{language === "te" ? "ప్రొఫైల్ మార్చు" : "Edit Profile"}</span>
              </button>
              <button type="button" className="profile-menu-item" onClick={handleLanguageToggle}>
                <span className="profile-menu-item-icon" aria-hidden="true">🌐</span>
                <span>{language === "te" ? "భాష" : "Language"}</span>
                <span className="profile-menu-item-hint">{languageToggleLabel(language)}</span>
              </button>
              <button type="button" className="profile-menu-item" onClick={toggleTheme}>
                <span className="profile-menu-item-icon" aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
                <span>{language === "te" ? "థీమ్" : "Theme"}</span>
                <span className="profile-menu-item-hint">
                  {theme === "dark"
                    ? language === "te"
                      ? "లైట్"
                      : "Light"
                    : language === "te"
                      ? "డార్క్"
                      : "Dark"}
                </span>
              </button>
            </div>
            <div className="profile-menu-divider" />
            <button type="button" className="profile-menu-item profile-menu-item--danger" onClick={handleLogout}>
              <span className="profile-menu-item-icon" aria-hidden="true">⎋</span>
              <span>{language === "te" ? "లాగౌట్" : "Logout"}</span>
            </button>
          </>
        )}
      </div>
    </div>
  ) : null;

  const confirmModal = confirmDialog ? (
    <div
      className="confirm-modal-overlay"
      role="button"
      tabIndex={0}
      onClick={() => closeConfirmDialog(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeConfirmDialog(false);
      }}
    >
      <section
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={language === "te" ? "నిర్ధారణ" : "Confirmation"}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{language === "te" ? "నిర్ధారణ" : "Confirm action"}</h3>
        <p>{confirmDialog.message}</p>
        <div className="confirm-modal-actions">
          <button type="button" className="ghost" onClick={() => closeConfirmDialog(false)}>
            {language === "te" ? "రద్దు" : "Cancel"}
          </button>
          <button type="button" onClick={() => closeConfirmDialog(true)}>
            {language === "te" ? "సరే" : "Confirm"}
          </button>
        </div>
      </section>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <>
        <div className="mobile-app-root" ref={workspaceScrollRef}>
          <MobileWorkspace
            language={language}
            authUser={authUser}
            activeTab={activeMobileTab}
            setActiveTab={goToMobileTab}
            tabs={mobileTabs}
            tabLabel={tMobileTab}
            headerDate={mobileHeaderDate}
            profileImageUrl={profileImageUrl}
            profileInitial={profileInitial}
            onProfileOpen={openProfilePanel}
            profileNeedsSetup={needsProfileSetup}
            scopeUsers={scopeUsers}
            selectedScopeUser={selectedScopeUser}
            setSelectedScopeUser={setSelectedScopeUser}
            loginAsUser={loginAsUser}
            exitImpersonation={exitImpersonation}
            filters={renderPeriodDriverFilters()}
            NavIcon={NavIcon}
            mobileTabIcons={mobileTabIcons}
            showNotifications={showUserNotifications}
            notifications={notifications}
            unreadNotificationCount={unreadNotificationCount}
            notificationsOpen={showNotifications}
            onToggleNotifications={() => {
              setShowNotifications((prev) => !prev);
              if (showProfilePanel) setShowProfilePanel(false);
            }}
            onCloseNotifications={() => setShowNotifications(false)}
            onMarkNotificationRead={markNotificationRead}
            onMarkAllNotificationsRead={markAllNotificationsRead}
            onClearAllNotifications={clearAllNotifications}
            searchValue={fleetSearch}
            onSearchChange={setFleetSearch}
            theme={theme}
            onThemeToggle={toggleTheme}
            userGreeting={profileForm.full_name || profile?.full_name || authUser?.identifier}
          >
            {renderMobilePage()}
          </MobileWorkspace>
        </div>
        {profilePanel}
        {driverDetailModal}
        {confirmModal}
      </>
    );
  }

  return (
    <div className={`layout ${isSidebarOpen ? "" : "sidebar-closed"}`}>
      {isSidebarOpen ? <aside className="sidebar sidebar--dock">
        <div className="sidebar-brand sidebar-brand--fleetflow">
          <div className="brand-mark" aria-hidden="true">FF</div>
          <div className="brand-copy">
            <h1>FleetFlow</h1>
            <p className="brand-tagline">{language === "te" ? "స్మార్ట్‌గా కదలండి" : "Move Smart. Move Easy."}</p>
          </div>
        </div>

        <div className="lang-row">
          <button
            type="button"
            className={`nav-toggle-btn nav-toggle-btn-sidebar ${isSidebarOpen ? "open" : ""}`}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            aria-label={isSidebarOpen
              ? (language === "te" ? "నావిగేషన్ మూసివేయి" : "Close navigation")
              : (language === "te" ? "నావిగేషన్ తెరువు" : "Open navigation")}
            aria-expanded={isSidebarOpen}
          >
            <span />
            <span />
            <span />
          </button>
          <button
            type="button"
            className="lang-btn"
            onClick={handleLanguageToggle}
          >
            {languageToggleLabel(language)}
          </button>
        </div>

        <p className="sidebar-section-label">{language === "te" ? "మెను" : "Menu"}</p>

        <div className="sidebar-nav">
          {navItems.map((item) => (
            <button key={item} className={`side-btn ${activePage === item ? "active" : ""}`} onClick={() => goToPage(item)}>
              <span className="side-btn-icon"><NavIcon name={navIcons[item] || "reports"} /></span>
              <span className="side-btn-text">{t(item)}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-foot">
          <p className="section-kicker">Signed In</p>
          <strong>{userDisplayName}</strong>
          <p className="muted sidebar-meta">{authUser.identifier}</p>
          {needsProfileSetup ? (
            <button type="button" className="sidebar-profile-setup-btn" onClick={openProfilePanel}>
              {language === "te" ? "ప్రొఫైల్ పూర్తి చేయండి" : "Complete profile"}
            </button>
          ) : (
            <button type="button" className="sidebar-profile-setup-btn ghost" onClick={openProfilePanel}>
              {language === "te" ? "ప్రొఫైల్ సవరించు" : "Edit profile"}
            </button>
          )}
        </div>
      </aside> : null}

      <main className="main workspace-shell" ref={workspaceScrollRef}>
        <div className="workspace-header ff-workspace-toolbar">
          <div className="ff-header-inner">
            <div className="ff-header-row ff-header-row--top">
              <div className="workspace-header-copy">
                {!isSidebarOpen ? (
                  <button
                    type="button"
                    className="nav-toggle-btn nav-toggle-btn-header"
                    onClick={() => setIsSidebarOpen((prev) => !prev)}
                    aria-label={language === "te" ? "\u0c28\u0c3e\u0c35\u0c3f\u0c17\u0c47\u0c37\u0c28\u0c4d \u0c24\u0c46\u0c30\u0c41\u0c35\u0c41" : "Open navigation"}
                    aria-expanded={isSidebarOpen}
                  >
                    <span />
                    <span />
                    <span />
                  </button>
                ) : null}
                <p className="section-kicker">{getGreeting(language)}, {userDisplayName}</p>
                <div className="workspace-title-row">
                  <h2>{t(activePage)}</h2>
                  <span className="workspace-tag">{workspaceDate}</span>
                </div>
                <p className="workspace-subtitle">{pageDescription}</p>
              </div>

              <div className="ff-header-controls top-profile-row" ref={profileTriggerRef}>
                {showUserNotifications ? (
                  <NotificationBell
                    notifications={notifications}
                    unreadCount={unreadNotificationCount}
                    open={showNotifications}
                    onToggle={() => {
                      setShowNotifications((prev) => !prev);
                      if (showProfilePanel) setShowProfilePanel(false);
                    }}
                    onClose={() => setShowNotifications(false)}
                    onMarkRead={markNotificationRead}
                    onMarkAllRead={markAllNotificationsRead}
                    onClearAll={clearAllNotifications}
                    language={language}
                  />
                ) : null}
                <button
                  type="button"
                  className={`profile-icon-btn ${needsProfileSetup ? "profile-incomplete" : ""} ${showProfilePanel ? "profile-icon-btn--active" : ""}`}
                  onClick={() => {
                    if (showProfilePanel) {
                      setShowProfilePanel(false);
                      return;
                    }
                    setShowNotifications(false);
                    openProfilePanel();
                  }}
                  aria-label={
                    needsProfileSetup
                      ? language === "te"
                        ? "ప్రొఫైల్ పూర్తి చేయండి"
                        : "Complete your profile"
                      : language === "te"
                        ? "ప్రొఫైల్ తెరువు"
                        : "Open profile"
                  }
                  aria-expanded={showProfilePanel}
                >
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt={userDisplayName} className="avatar-img avatar-img-btn" />
                  ) : (
                    profileInitial
                  )}
                  {profileIncompleteDot}
                </button>
              </div>
            </div>

            <div className="ff-header-row ff-header-row--bottom">
              <FleetSearchBar
                value={fleetSearch}
                onChange={setFleetSearch}
                placeholder={language === "te" ? "ట్రిప్, డ్రైవర్, లారీ శోధించండి…" : "Search trips, drivers, lorries…"}
                className="ff-search--desktop"
              />
              <div className="ff-header-toolbar-end">
                <button
                  type="button"
                  className="ff-theme-btn"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? (language === "te" ? "లైట్ మోడ్" : "Light mode") : (language === "te" ? "డార్క్ మోడ్" : "Dark mode")}
                >
                  {theme === "dark" ? "☀" : "☾"}
                </button>
                {authUser.role === "admin" ? (
                  <div className="scope-user-picker">
                    <label htmlFor="scope-user-select">{language === "te" ? "యూజర్ డేటా" : "View user data"}</label>
                    <select
                      id="scope-user-select"
                      value={selectedScopeUser}
                      onChange={(event) => setSelectedScopeUser(event.target.value)}
                    >
                      <option value="">{language === "te" ? "యూజర్ ఎంచుకోండి" : "Select user"}</option>
                      {scopeUsers.map((user) => (
                        <option key={user.identifier} value={user.identifier}>
                          {user.full_name ? `${user.full_name} (${user.identifier})` : user.identifier}
                        </option>
                      ))}
                    </select>
                    {selectedScopeUser ? (
                      <button type="button" className="ghost compact-login-as-btn" onClick={() => loginAsUser(selectedScopeUser)}>
                        {language === "te" ? "యూజర్‌గా లాగిన్" : "Login as user"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {authUser.acting_as_admin ? (
                  <button type="button" className="ghost compact-login-as-btn" onClick={exitImpersonation}>
                    {language === "te" ? "అడ్మిన్‌కు తిరిగి" : "Back to admin"}
                  </button>
                ) : null}
                {activePage !== "Add Lorry" ? (
                  <div className="workspace-metrics ff-header-metrics">
                    {workspaceMetrics.map((item) => (
                      <div className="workspace-metric" key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {authUser.role === "user" && activePage !== "Trip Contacts" ? (
          <>
            <div className="global-add-bar">
              <button onClick={() => goToPage("Add Lorry")}>
                <span><NavIcon name={navIcons["Add Lorry"]} /></span>
                <span>{language === "te" ? "లారీ చేర్చు" : "Add Lorry"}</span>
              </button>
              <button onClick={() => goToPage("Drivers")}>
                <span><NavIcon name={navIcons.Drivers} /></span>
                <span>{language === "te" ? "డ్రైవర్ చేర్చు" : "Add Driver"}</span>
              </button>
              <button onClick={() => goToPage("Create Trip")}>
                <span><NavIcon name={navIcons["Create Trip"]} /></span>
                <span>{language === "te" ? "ట్రిప్ + ఖర్చు చేర్చు" : "Add Trip + Expense"}</span>
              </button>
            </div>
            <button
              type="button"
              className="mobile-sidebar-cta"
              onClick={() => {
                setIsSidebarOpen(true);
                if (typeof window !== "undefined") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
            >
              {language === "te" ? "మెను ఓపెన్ చేయండి" : "Open Menu"}
            </button>
          </>
        ) : null}

        {renderPeriodDriverFilters()}

        <div className="content-stack ff-workspace-body">{renderPage()}</div>
        <nav className="mobile-bottom-nav" aria-label={language === "te" ? "మొబైల్ నావిగేషన్" : "Mobile navigation"}>
          {mobileNavItems.map((item) => (
            <button
              key={item}
              type="button"
              className={`mobile-bottom-nav-btn ${activePage === item ? "active" : ""}`}
              onClick={() => goToPage(item)}
            >
              <span className="mobile-bottom-nav-icon">
                <NavIcon name={navIcons[item] || "reports"} />
              </span>
              <span>{t(item)}</span>
            </button>
          ))}
          <button
            type="button"
            className={`mobile-bottom-nav-btn mobile-bottom-nav-menu ${isSidebarOpen ? "active" : ""}`}
            onClick={toggleMobileMenu}
            aria-label={language === "te" ? "మెను తెరువు" : "Open menu"}
          >
            <span className="mobile-bottom-nav-icon">
              <span className={`nav-toggle-btn mobile-bottom-nav-burger ${isSidebarOpen ? "open" : ""}`} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </span>
            <span>{language === "te" ? "మెను" : "Menu"}</span>
          </button>
        </nav>
        {driverDetailModal}
        {profilePanel}
        {confirmModal}
      </main>
    </div>
  );
}

function NavIcon({ name }) {
  const iconProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  };

  if (name === "dashboard") {
    return (
      <svg {...iconProps}>
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="5" rx="2" />
        <rect x="13" y="10" width="8" height="11" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
      </svg>
    );
  }

  if (name === "lorry") {
    return (
      <svg {...iconProps}>
        <path d="M3 7h11v8H3z" />
        <path d="M14 10h3l3 3v2h-6z" />
        <circle cx="7.5" cy="18" r="1.5" />
        <circle cx="17.5" cy="18" r="1.5" />
      </svg>
    );
  }

  if (name === "drivers") {
    return (
      <svg {...iconProps}>
        <circle cx="9" cy="8" r="3" />
        <path d="M4 19c.8-2.7 2.8-4 5-4s4.2 1.3 5 4" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M15.5 18c.5-1.8 1.8-2.9 3.5-3.3" />
      </svg>
    );
  }

  if (name === "trip") {
    return (
      <svg {...iconProps}>
        <path d="M5 18V6l10-2v12" />
        <path d="M15 8h4v10" />
        <path d="M8 9h4" />
        <path d="M8 13h4" />
      </svg>
    );
  }

  if (name === "steering") {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="2.2" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="m4.9 4.9 2.1 2.1" />
        <path d="m17 17 2.1 2.1" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
        <path d="m4.9 19.1 2.1-2.1" />
        <path d="m17 7 2.1-2.1" />
      </svg>
    );
  }

  if (name === "add-box") {
    return (
      <svg {...iconProps}>
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M12 8v8" />
        <path d="M8 12h8" />
      </svg>
    );
  }

  if (name === "done") {
    return (
      <svg {...iconProps}>
        <path d="M20 7 9 18l-5-5" />
      </svg>
    );
  }

  if (name === "contacts") {
    return (
      <svg {...iconProps}>
        <path d="M7 5h10a2 2 0 0 1 2 2v10l-4-2-4 2-4-2-4 2V7a2 2 0 0 1 2-2Z" />
        <path d="M9 9h6" />
        <path d="M9 12h4" />
      </svg>
    );
  }

  if (name === "profit") {
    return (
      <svg {...iconProps}>
        <path d="M12 3v18" />
        <path d="M16 7.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 3 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3" />
      </svg>
    );
  }

  if (name === "tracking") {
    return (
      <svg {...iconProps}>
        <path d="M12 21s6-4.8 6-10a6 6 0 1 0-12 0c0 5.2 6 10 6 10Z" />
        <circle cx="12" cy="11" r="2.2" />
      </svg>
    );
  }

  if (name === "more") {
    return (
      <svg {...iconProps}>
        <circle cx="6" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        <circle cx="18" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg {...iconProps}>
      <path d="M5 6h14v4H5z" />
      <path d="M5 12h14v6H5z" />
    </svg>
  );
}
