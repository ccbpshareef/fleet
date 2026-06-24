import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import DriverFilterBar from "./components/DriverFilterBar";
import NotificationBell from "./components/NotificationBell";
import MobileWorkspace from "./components/MobileWorkspace";
import PeriodFilterBar from "./components/PeriodFilterBar";
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
import { formatMoney, languageToggleLabel, na, activeLabel, roleLabel } from "./utils/i18n";
import {
  computeDashboardFromTrips,
  filterTripsByDriver,
  filterTripsByPeriod,
  getDriversInPeriod,
  getPeriodLabel
} from "./utils/periodFilter";
import { computeAssignmentPaySummary, computeDriverEarningsSummary } from "./utils/driverEarnings";
import { roundMoney } from "./utils/money";

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

const adminMobileTabs = ["Dashboard", "Done", "Contacts", "Reports"];
const userMobileTabs = ["Dashboard", "Done", "Contacts", "Trips", "Add", "Reports"];
const driverMobileTabs = ["Dashboard", "Done", "Add", "Reports"];
const userActionPages = new Set(["Add Lorry", "Drivers", "Create Trip"]);
const userActionMobileTabs = new Set(["Trips", "Add"]);
const mobileFilterTabs = new Set(["Dashboard", "Done", "Contacts", "Reports", "Trips"]);
const workspaceFilterPages = new Set(["Dashboard", "Done Trips", "Trip Contacts", "Reports", "Drivers"]);

const mobileTabLabels = {
  Dashboard: { en: "Home", te: "హోమ్" },
  Done: { en: "Done", te: "పూర్తి" },
  Contacts: { en: "Contacts", te: "కాంటాక్ట్" },
  Trips: { en: "Drivers", te: "డ్రైవర్" },
  Add: { en: "Add", te: "కొత్త" },
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
  Reports: "reports"
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
  Reports: {
    en: "Business summaries and operational reports.",
    te: "వ్యాపార సారాంశాలు మరియు రిపోర్ట్స్."
  }
};
const LANGUAGE_STORAGE_KEY = "fleet_preferred_language";

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
  const workspaceScrollRef = useRef(null);
  const profileMenuRef = useRef(null);
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
  const [scopeUsers, setScopeUsers] = useState([]);
  const [selectedScopeUser, setSelectedScopeUser] = useState("");
  const [activeMobileTab, setActiveMobileTab] = useState("Dashboard");
  const [periodFilter, setPeriodFilter] = useState("complete");
  const [driverFilterId, setDriverFilterId] = useState("");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(true);
  const isMobile = useIsMobile();

  const authQuery = useMemo(() => {
    if (!authUser) return null;
    const query = { viewer: authUser.identifier, role: authUser.role };
    if (authUser.role === "admin" && selectedScopeUser) {
      query.scope_user = selectedScopeUser;
    }
    return query;
  }, [authUser, selectedScopeUser]);

  async function loadData() {
    const canLoadNotifications =
      authQuery?.role === "user" || (authQuery?.role === "admin" && authQuery?.scope_user);
    const [dash, dr, lo, tr, ex, asg, notif] = await Promise.all([
      api.getDashboard(authQuery),
      api.getDrivers(authQuery),
      api.getLorries(authQuery),
      api.getTrips(authQuery),
      api.getExpenses(authQuery),
      api.getDriverAssignments(authQuery),
      canLoadNotifications ? api.getNotifications(authQuery).catch(() => []) : Promise.resolve([])
    ]);
    setDashboard(dash);
    setDrivers(dr);
    setLorries(lo);
    setTrips(tr);
    setExpenses(ex);
    setDriverAssignments(asg);
    setNotifications(notif || []);
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

  function parseApiDetail(error, fallback) {
    const raw = error?.message || "";
    try {
      const parsed = JSON.parse(raw);
      const detail = parsed?.detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) {
        return detail.map((item) => (typeof item === "string" ? item : item?.msg || "")).filter(Boolean).join(". ");
      }
      return raw || fallback;
    } catch {
      return raw || fallback;
    }
  }

  async function saveDriver() {
    if (authUser?.role !== "user") return;
    setDriverSaveError("");
    if (!newDriver.name?.trim() || !newDriver.phone?.trim()) {
      const msg = language === "te" ? "పేరు మరియు ఫోన్ అవసరం." : "Driver name and phone are required.";
      setDriverSaveError(msg);
      alert(msg);
      return;
    }
    const loginId = (newDriver.login_identifier || "").trim().toLowerCase();
    if (loginId.length >= 3) {
      try {
        const check = await api.checkUserId(loginId);
        if (!check.available) {
          const msg = check.message || (language === "te" ? "లాగిన్ ID ఇప్పటికే ఉంది" : "Login ID already exists");
          setDriverSaveError(msg);
          alert(msg);
          return;
        }
      } catch {
        /* server will validate */
      }
    }
    try {
      const created = await api.createDriver(
        { ...newDriver, login_identifier: loginId || newDriver.login_identifier },
        authQuery
      );
      setLastDriverCreated(created);
      setNewDriver({ name: "", phone: "", license_number: "", login_identifier: "", password: "" });
      setDriverSaveError("");
      await loadData();
    } catch (error) {
      const msg = parseApiDetail(
        error,
        language === "te" ? "డ్రైవర్ సేవ్ విఫలమైంది." : "Failed to save driver."
      );
      setDriverSaveError(msg);
      alert(msg);
    }
  }

  async function toggleDriverStatus(driver) {
    if (authUser?.role !== "user") return;
    await api.updateDriverStatus(driver.id, !driver.is_active, authQuery);
    if (selectedDriver?.id === driver.id) {
      await openDriverDetail({ ...driver, is_active: !driver.is_active });
    }
    await loadData();
  }

  async function deleteDriver(driver) {
    if (authUser?.role !== "user") return;
    const confirmMsg =
      language === "te"
        ? `${driver.name} ను తొలగించాలా? ఈ డ్రైవర్ ట్రిప్ చరిత్ర, అసైన్‌మెంట్లు మరియు లాగిన్ కూడా తొలగించబడతాయి.`
        : `Delete ${driver.name}? Their trip history, assignments, and login will also be removed.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.deleteDriver(driver.id, authQuery);
      if (selectedDriver?.id === driver.id) {
        closeDriverDetail();
      }
      await loadData();
    } catch (error) {
      const msg = parseApiDetail(
        error,
        language === "te" ? "డ్రైవర్ తొలగింపు విఫలమైంది." : "Failed to delete driver."
      );
      alert(msg);
    }
  }

  async function saveLorry(e) {
    e.preventDefault();
    if (authUser?.role !== "user") return;
    await api.createLorry(
      {
        vehicle_number: newLorry.vehicle_number,
        current_location: "",
        driver_id: null
      },
      authQuery
    );
    const latestLorry = await api.getLorries(authQuery).then((items) =>
      items.find((item) => item.vehicle_number === newLorry.vehicle_number)
    );
    if (latestLorry && newLorry.driver_id) {
      await api.createDriverAssignment(
        {
          driver_id: Number(newLorry.driver_id),
          lorry_id: latestLorry.id,
          assigned_at: newLorry.assigned_at || null
        },
        authQuery
      );
    }
    setNewLorry({ vehicle_number: "", lorry_type: "Open Body", driver_id: "", assigned_at: "" });
    await loadData();
  }

  async function toggleLorryStatus(lorry) {
    if (authUser?.role !== "user") return;
    await api.updateLorryStatus(lorry.id, !lorry.is_active, authQuery);
    if (selectedLorryHistory?.lorry_id === lorry.id) {
      const latest = await api.getLorryHistory(lorry.id, authQuery);
      setSelectedLorryHistory(latest);
    }
    await loadData();
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
    setNewTrip({
      ...initialTrip,
      driver_id: authUser?.role === "driver" ? String(authUser.driver_id || "") : ""
    });
    await loadData();
  }

  async function updateTrip(tripId, payload) {
    await api.updateTrip(tripId, payload, authQuery);
    await loadData();
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
    } catch (error) {
      alert(error.message || "Could not login as user");
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
  }

  async function assignDriverToLorry() {
    if (authUser?.role !== "user") return;
    if (!assignmentForm.driver_id || !assignmentForm.lorry_id) return;
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
  }

  async function completeAssignment(assignmentId, payload = {}) {
    if (authUser?.role !== "user") return;
    await api.completeDriverAssignment(assignmentId, payload, authQuery);
    await loadData();
  }

  async function addAssignmentLeave(assignmentId, payload) {
    if (authUser?.role !== "user") return;
    await api.addDriverAssignmentLeave(assignmentId, payload, authQuery);
    await loadData();
  }

  async function acceptDriverAssignment(assignmentId) {
    if (authUser?.role !== "driver") return;
    await api.acceptDriverAssignment(assignmentId, authQuery);
    await loadData();
  }

  async function markNotificationRead(notification) {
    if (!notification || notification.is_read) return;
    await api.markNotificationRead(notification.id, authQuery);
    await loadData();
  }

  async function markAllNotificationsRead() {
    await api.markAllNotificationsRead(authQuery);
    await loadData();
  }

  async function updateAssignment(assignmentId, payload) {
    if (authUser?.role !== "user") return;
    await api.updateDriverAssignment(assignmentId, payload, authQuery);
    await loadData();
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
    } catch (_error) {
      setLoginError(language === "te" ? "లాగిన్ విఫలమైంది" : "Invalid username or password");
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
      setLoginForm({ identifier: created.identifier, password: "" });
      setLoginError("");
      setLoginNotice(
        language === "te"
          ? `అకౌంట్ సృష్టించబడింది. మీ యూజర్ ID: ${created.identifier}`
          : `Account created. Your User ID: ${created.identifier}`
      );
      payload?.onDone?.();
    } catch (error) {
      const raw = error?.message || "";
      try {
        const parsed = JSON.parse(raw);
        setLoginError(parsed?.detail || (language === "te" ? "నమోదు విఫలమైంది" : "Registration failed"));
      } catch {
        setLoginError(raw || (language === "te" ? "నమోదు విఫలమైంది" : "Registration failed"));
      }
    }
  }

  async function handleForgotPassword(identifier, newPassword, onDone) {
    try {
      await api.forgotPassword({ identifier, new_password: newPassword });
      alert(language === "te" ? "పాస్‌వర్డ్ విజయవంతంగా రీసెట్ అయింది." : "Password reset successful.");
      onDone?.();
    } catch (error) {
      alert(error.message || "Password reset failed");
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
          <AddLorryPage
            form={newLorry}
            setForm={setNewLorry}
            drivers={drivers}
            lorries={lorries}
            assignments={driverAssignments}
            selectedLorryHistory={selectedLorryHistory}
            onSelectLorry={openLorryHistory}
            onToggleLorryStatus={toggleLorryStatus}
            onUpdateAssignment={updateAssignment}
            onSubmit={saveLorry}
            language={language}
          />
          <CreateTripPage
            form={newTrip}
            setForm={setNewTrip}
            lorries={lorries}
            drivers={drivers}
            onSubmit={saveTrip}
            language={language}
          />
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
        onAddTrip={() => setActivePage("Create Trip")}
        onAddExpense={() => setActivePage("Create Trip")}
        language={language}
        expenseTotalsByTrip={expenseTotalsByTrip}
        onUpdateTrip={updateTrip}
        periodFilter={periodFilter}
        userName={profileForm.full_name || profile?.full_name || authUser?.identifier}
        userRole={authUser?.role}
        driverAssignments={driverAssignments}
        driverId={authUser?.driver_id}
        onAcceptAssignment={acceptDriverAssignment}
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
  const mobileActiveTripCount = filteredTrips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done").length;
  const mobileHeaderDate = new Date().toLocaleDateString(language === "te" ? "te-IN" : "en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
  const mobileHeaderStats =
    authUser?.role === "driver"
      ? [
          { label: tMobileTab("Trips"), value: driverEarningsSummary.tripCount },
          { label: language === "te" ? "సంపాదన" : "Earnings", value: `Rs ${driverEarningsSummary.totalEarning.toFixed(0)}` },
          { label: tMobileTab("Trips Live"), value: driverEarningsSummary.activeTripCount }
        ]
      : [
          { label: tMobileTab("Fleet"), value: filteredDashboard?.total_lorries ?? lorries.length },
          { label: tMobileTab("Trips Live"), value: mobileActiveTripCount },
          { label: tMobileTab("Drivers"), value: driversForFilter.length || drivers.length }
        ];
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

  function goToPage(page) {
    setActivePage(page);
    if (typeof window !== "undefined" && window.innerWidth <= 860) {
      setIsSidebarOpen(false);
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
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target)) {
        setShowProfilePanel(false);
      }
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
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  if (!isSessionReady) {
    return (
      <main className="main auth-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="startup-loader">
          <span className="startup-loader-spinner" aria-hidden="true" />
          <p className="muted">{language === "te" ? "లోడ్ అవుతోంది..." : "Loading workspace..."}</p>
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className={`main auth-shell ${isMobile ? "auth-shell-mobile" : ""}`} style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
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

  const selectedDriverStintPay = useMemo(() => {
    if (!selectedDriver) return null;
    return computeAssignmentPaySummary(driverAssignments, { driverId: selectedDriver.id });
  }, [selectedDriver, driverAssignments]);

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
          </div>
        ) : null}
        {selectedDriverHistory ? (
          <>
            <p>{language === "te" ? "మొత్తం ట్రిప్స్" : "Total Trips"}: {selectedDriverHistory.total_trips}</p>
            <p>{language === "te" ? "మొత్తం పని రోజులు" : "Total Working Days"}: {selectedDriverHistory.total_working_days || 0}</p>
            <p>{language === "te" ? "మొత్తం ట్రాన్స్‌పోర్ట్ మొత్తం" : "Total Transport Amount"}: {formatMoney(language, selectedDriverHistory.total_transport_amount)}</p>
            <p>{language === "te" ? "మొత్తం కమిషన్" : "Total Commission"}: {formatMoney(language, selectedDriverHistory.total_commission_amount)}</p>
            <p>{language === "te" ? "మొత్తం సంపాదన" : "Total Earning"}: {formatMoney(language, selectedDriverHistory.total_driver_earning)}</p>
            <h4 style={{ margin: "12px 0 8px" }}>
              {language === "te" ? "ఇటీవలి ట్రిప్ లెడ్జర్" : "Recent Trip Ledger"}
            </h4>
            <div className="cards-list">
              {selectedDriverHistory.trips?.map((trip) => (
                <div className="mini-card" key={trip.trip_id}>
                  <p>#{trip.trip_id} - {trip.route}</p>
                  <p>{language === "te" ? "లారీ" : "Lorry"}: {trip.lorry_number || trip.lorry_id}</p>
                  <p>{language === "te" ? "పని రోజులు" : "Working Days"}: {trip.working_days || 0}</p>
                  <p>{language === "te" ? "ట్రాన్స్‌పోర్ట్ మొత్తం" : "Transport Amount"}: {formatMoney(language, trip.transport_amount ?? trip.load_price)}</p>
                  <p>{language === "te" ? "కమిషన్" : "Commission"}: {formatMoney(language, trip.commission_amount)}</p>
                  <p>{language === "te" ? "ట్రిప్ మొత్తం సంపాదన" : "Trip Total Earning"}: {formatMoney(language, trip.trip_total_earning ?? trip.driver_earned)}</p>
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
      className={isMobile ? "m-profile-overlay" : undefined}
      role="presentation"
      onClick={isMobile ? () => setShowProfilePanel(false) : undefined}
    >
      <div
        className={`top-profile-popover ${isMobile ? "m-profile-sheet" : ""}`}
        ref={isMobile ? profileMenuRef : undefined}
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
          <div className="form-grid single" style={{ marginTop: 10 }}>
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
          <div className="top-profile-meta">
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

        <div className="inline-actions" style={{ marginBottom: 0 }}>
          {isEditingProfile || needsProfileSetup ? (
            <>
              <button type="button" onClick={saveProfile} disabled={isSavingProfile || !profileForm.full_name}>
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
                      : "Save"}
              </button>
              {!needsProfileSetup ? (
                <button type="button" className="ghost" onClick={() => setIsEditingProfile(false)}>
                  {language === "te" ? "రద్దు" : "Cancel"}
                </button>
              ) : null}
            </>
          ) : (
            <button type="button" onClick={() => setIsEditingProfile(true)}>
              {language === "te" ? "ప్రొఫైల్ మార్చు" : "Edit Profile"}
            </button>
          )}
          <button type="button" className="ghost" onClick={handleLanguageToggle}>
            {languageToggleLabel(language)}
          </button>
          <button className="ghost" onClick={handleLogout}>
            {language === "te" ? "లాగౌట్" : "Logout"}
          </button>
        </div>
      </div>
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
            setActiveTab={setActiveMobileTab}
            tabs={mobileTabs}
            tabLabel={tMobileTab}
            tabHints={mobileTabHints}
            headerDate={mobileHeaderDate}
            headerStats={mobileHeaderStats}
            profileImageUrl={profileImageUrl}
            profileInitial={profileInitial}
            onProfileOpen={openProfilePanel}
            profileNeedsSetup={needsProfileSetup}
            isNavOpen={isMobileNavOpen}
            setIsNavOpen={setIsMobileNavOpen}
            scopeUsers={scopeUsers}
            selectedScopeUser={selectedScopeUser}
            setSelectedScopeUser={setSelectedScopeUser}
            loginAsUser={loginAsUser}
            exitImpersonation={exitImpersonation}
            filters={renderPeriodDriverFilters()}
            NavIcon={NavIcon}
            mobileTabIcons={mobileTabIcons}
          >
            {renderMobilePage()}
          </MobileWorkspace>
        </div>
        {profilePanel}
        {driverDetailModal}
      </>
    );
  }

  return (
    <div className={`layout ${isSidebarOpen ? "" : "sidebar-closed"}`}>
      {isSidebarOpen ? <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">FL</div>
          <div className="brand-copy">
            <h1>{language === "te" ? "ఫ్లీట్" : "Fleet"}</h1>
            <p className="muted">{language === "te" ? "వర్క్‌స్పేస్" : "Workspace"}</p>
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
        <div className="workspace-header">
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
            <p className="section-kicker">{workspaceDate}</p>
            <div className="workspace-title-row">
              <h2>{t(activePage)}</h2>
              <span className="workspace-tag">
                {authUser.role === "admin"
                  ? (selectedScopeUser
                    ? `${language === "te" ? "యూజర్" : "User"}: ${selectedScopeUser}`
                    : (language === "te" ? "యూజర్ ఎంచుకోండి" : "Select user"))
                  : authUser.role === "driver"
                    ? (language === "te" ? "డ్రైవర్ వీక్" : "Driver View")
                    : "Operations View"}
              </span>
            </div>
            <p className="workspace-subtitle">{pageDescription}</p>
            <div className="page-help-banner" role="note">
              <span className="page-help-icon" aria-hidden="true">💡</span>
              <div>
                <strong>{language === "te" ? "ఈ పేజీ లో" : "On this page"}</strong>
                {pageDescription}
              </div>
            </div>
          </div>


          <div className="workspace-header-actions">
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
            <div className="workspace-metrics">
              {workspaceMetrics.map((item) => (
                <div className="workspace-metric" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="top-profile-row" ref={profileMenuRef}>
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
                  language={language}
                />
              ) : null}
              <button
                type="button"
                className={`profile-icon-btn ${needsProfileSetup ? "profile-incomplete" : ""}`}
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

              {showProfilePanel ? (
                <div className="top-profile-popover">
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
                    <div className="form-grid single" style={{ marginTop: 10 }}>
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
                    <div className="top-profile-meta">
                      <p>{language === "te" ? "ఫోన్" : "Phone"}: {profile?.phone || "-"}</p>
                      <p>{language === "te" ? "ఇమెయిల్" : "Email"}: {profile?.email || "-"}</p>
                    </div>
                  )}

                  <div className="inline-actions" style={{ marginBottom: 0 }}>
                    {isEditingProfile || needsProfileSetup ? (
                      <>
                        <button type="button" onClick={saveProfile} disabled={isSavingProfile || !profileForm.full_name}>
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
                                : "Save"}
                        </button>
                        {!needsProfileSetup ? (
                          <button type="button" className="ghost" onClick={() => setIsEditingProfile(false)}>
                            {language === "te" ? "రద్దు" : "Cancel"}
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <button type="button" onClick={() => setIsEditingProfile(true)}>
                        {language === "te" ? "ప్రొఫైల్ మార్చు" : "Edit Profile"}
                      </button>
                    )}
                    <button type="button" className="ghost" onClick={handleLanguageToggle}>
                      {languageToggleLabel(language)}
                    </button>
                    <button className="ghost" onClick={handleLogout}>
                      {language === "te" ? "లాగౌట్" : "Logout"}
                    </button>
                  </div>
                </div>
              ) : null}
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

        <div className="content-stack">{renderPage()}</div>
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

  return (
    <svg {...iconProps}>
      <path d="M5 6h14v4H5z" />
      <path d="M5 12h14v6H5z" />
    </svg>
  );
}
