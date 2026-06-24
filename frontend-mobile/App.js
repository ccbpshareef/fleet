import { StatusBar } from "expo-status-bar";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { api } from "./api";
import AddLorryScreen from "./src/screens/AddLorryScreen";
import CreateTripScreen from "./src/screens/CreateTripScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import DoneTripsScreen from "./src/screens/DoneTripsScreen";
import DriverDetailScreen from "./src/screens/DriverDetailScreen";
import DriverManagementScreen from "./src/screens/DriverManagementScreen";
import LoginScreen from "./src/screens/LoginScreen";
import ProfitSummaryScreen from "./src/screens/ProfitSummaryScreen";
import ProfileSettingsModal from "./src/screens/ProfileSettingsModal";
import ReportsScreen from "./src/screens/ReportsScreen";
import TripContactsScreen from "./src/screens/TripContactsScreen";
import PeriodFilterBar from "./src/components/PeriodFilterBar";
import DriverFilterBar from "./src/components/DriverFilterBar";
import {
  computeDashboardFromTrips,
  filterTripsByDriver,
  filterTripsByPeriod,
  getDriversInPeriod,
  getPeriodLabel
} from "./src/utils/periodFilter";
import { buildExpenseTotalsByTrip } from "./src/utils/expenseTotals";
import { roundMoney } from "./src/utils/money";
import { computeDriverEarningsSummary } from "./src/utils/driverEarnings";
import { parseApiDetail } from "./src/utils/parseApiError";
import { roleLabel, t as translate } from "./src/utils/i18n";
import { colors, radius, typography } from "./src/theme";

const MemoDashboardScreen = memo(DashboardScreen);
const MemoDoneTripsScreen = memo(DoneTripsScreen);
const MemoTripContactsScreen = memo(TripContactsScreen);
const MemoReportsScreen = memo(ReportsScreen);
const MemoDriverManagementScreen = memo(DriverManagementScreen);
const MemoAddLorryScreen = memo(AddLorryScreen);
const MemoCreateTripScreen = memo(CreateTripScreen);
const MemoProfitSummaryScreen = memo(ProfitSummaryScreen);

const adminTabs = ["Dashboard", "Done", "Contacts", "Reports"];
const userTabs = ["Dashboard", "Done", "Contacts", "Trips", "Add", "Reports"];
const driverTabs = ["Dashboard", "Done", "Add", "Reports"];
const userActionTabs = new Set(["Trips", "Add"]);

const bottomTabIcons = {
  Dashboard: "view-dashboard-outline",
  Done: "check-decagram-outline",
  Contacts: "card-account-phone-outline",
  Trips: "steering",
  Add: "plus-box-outline",
  Reports: "chart-line"
};

const teluguTabLabels = {
  Dashboard: "హోమ్",
  Done: "పూర్తి",
  Contacts: "కాంటాక్ట్",
  Trips: "డ్రైవర్",
  Add: "కొత్త",
  Reports: "రిపోర్ట్",
  "Fleet Admin": "ఫ్లీట్ వర్క్‌స్పేస్",
  Fleet: "ఫ్లీట్",
  "Trips Live": "లైవ్ ట్రిప్స్",
  Drivers: "డ్రైవర్లు"
};

const TELUGU_LABEL = "తెలుగు";
const OPEN_NAV_LABEL = "నావిగేషన్ తెరవు";
const CLOSE_NAV_LABEL = "నావిగేషన్ మూసివేయి";

const tabHints = {
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
const WEB_UI_URL = process.env.EXPO_PUBLIC_WEB_UI_URL || "http://localhost:5173";
const FORCE_WEB_UI = process.env.EXPO_PUBLIC_MOBILE_UI_MODE === "web";
const LANGUAGE_STORAGE_KEY = "fleet_preferred_language";

function WebUiMirror() {
  if (Platform.OS === "web") {
    return (
      <SafeAreaView style={styles.webMirrorSafeArea}>
        <iframe src={WEB_UI_URL} title="Fleet Web UI" style={styles.webMirrorFrame} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.webMirrorSafeArea}>
      <StatusBar style="dark" />
      <WebView source={{ uri: WEB_UI_URL }} startInLoadingState />
    </SafeAreaView>
  );
}

function FleetWorkspaceApp() {
  const contentScrollRef = useRef(null);

  const [activeTab, setActiveTab] = useState("Dashboard");
  const [language, setLanguage] = useState("en");
  const [periodFilter, setPeriodFilter] = useState("complete");
  const [driverFilterId, setDriverFilterId] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [lorries, setLorries] = useState([]);
  const [trips, setTrips] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedDriverHistory, setSelectedDriverHistory] = useState(null);
  const [selectedLorryHistory, setSelectedLorryHistory] = useState(null);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [driverAssignments, setDriverAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({
    lorry_id: "",
    driver_id: "",
    assigned_at: "",
    daily_wage: "",
    commission_percent: "6",
    notes: ""
  });
  const [tripForm, setTripForm] = useState({
    lorry_id: "",
    driver_id: "",
    load_location: "",
    unload_location: "",
    contact_person_name: "",
    contact_person_phone: "",
    loading_date: "",
    unloading_date: "",
    load_type: "",
    load_price: "",
    status: "Loading",
    diesel: "",
    toll: "",
    driver_bata: "",
    driver_daily_wage: "",
    driver_commission_percent: "",
    driver_commission_amount: "",
    puncture: "",
    repair: "",
    other_expense: "",
    diesel_image_url: "",
    toll_image_url: "",
    puncture_image_url: "",
    repair_image_url: "",
    other_image_url: ""
  });
  const [lorryForm, setLorryForm] = useState({
    vehicle_number: "",
    lorry_type: "Open Body",
    driver_id: null
  });
  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
  const [authUser, setAuthUser] = useState(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [loginError, setLoginError] = useState("");
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
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [driverForm, setDriverForm] = useState({
    name: "",
    phone: "",
    license_number: "",
    login_identifier: "",
    password: ""
  });
  const [driverSaveError, setDriverSaveError] = useState("");
  const [scopeUsers, setScopeUsers] = useState([]);
  const [selectedScopeUser, setSelectedScopeUser] = useState("");
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);
  const assignmentsLoadedRef = useRef(false);

  const authQuery = useMemo(() => {
    if (!authUser) return null;
    const query = { viewer: authUser.identifier, role: authUser.role };
    if (authUser.role === "admin" && selectedScopeUser) {
      query.scope_user = selectedScopeUser;
    }
    return query;
  }, [authUser, selectedScopeUser]);
  const t = (key) => (language === "te" ? teluguTabLabels[key] || key : key);
  const tabs =
    authUser?.role === "admin" ? adminTabs : authUser?.role === "driver" ? driverTabs : userTabs;
  const headerDate = useMemo(
    () =>
      new Date().toLocaleDateString(language === "te" ? "te-IN" : "en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short"
      }),
    [language]
  );

  const profileImageUrl = profile?.profile_image_url || profileForm.profile_image_url || "";
  const profileInitial = (profile?.full_name || authUser?.identifier || "U").slice(0, 1).toUpperCase();
  function setLanguagePreference(nextLanguage) {
    setLanguage(nextLanguage);
    setProfileForm((prev) => ({ ...prev, preferred_language: nextLanguage }));
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage).catch(() => {});
  }

  async function handleProfileImageSelection(source = "library") {
    try {
      if (source === "camera") {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          Alert.alert("Permission needed", language === "te" ? "కెమెరా అనుమతి అవసరం." : "Camera permission is required.");
          return;
        }
      } else {
        const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!mediaPermission.granted) {
          Alert.alert("Permission needed", language === "te" ? "గ్యాలరీ అనుమతి అవసరం." : "Gallery permission is required.");
          return;
        }
      }

      const pickerResult = source === "camera"
        ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.7,
          base64: true
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
          base64: true
        });

      if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

      const asset = pickerResult.assets[0];
      let imageValue = asset.uri;
      if (asset.base64) {
        const mime = asset.mimeType || "image/jpeg";
        imageValue = `data:${mime};base64,${asset.base64}`;
      }
      setProfileForm((prev) => ({ ...prev, profile_image_url: imageValue }));
    } catch (_error) {
      Alert.alert("Error", language === "te" ? "చిత్రం ఎంచుకోవడం విఫలమైంది." : "Failed to select image.");
    }
  }

  const refresh = useCallback(
    async ({ includeAssignments = false } = {}) => {
      if (!authQuery) return;

      if (refreshInFlightRef.current) {
        refreshQueuedRef.current = true;
        return;
      }

      refreshInFlightRef.current = true;
      try {
        const corePromise = Promise.all([
          api.getDrivers(authQuery),
          api.getLorries(authQuery),
          api.getTrips(authQuery),
          api.getExpenses(authQuery)
        ]);
        const assignmentsPromise =
          includeAssignments && (authUser?.role === "user" || authUser?.role === "driver")
            ? api.getDriverAssignments(authQuery)
            : Promise.resolve(null);

        const [[dr, lo, tr, ex], asg] = await Promise.all([corePromise, assignmentsPromise]);
        setDrivers(dr);
        setLorries(lo);
        setTrips(tr);
        setExpenses(ex);
        if (asg) {
          setDriverAssignments(asg);
          assignmentsLoadedRef.current = true;
        }
      } finally {
        refreshInFlightRef.current = false;
        if (refreshQueuedRef.current) {
          refreshQueuedRef.current = false;
          refresh({ includeAssignments }).catch(console.error);
        }
      }
    },
    [authQuery, authUser?.role]
  );

  const refreshTripsAndExpenses = useCallback(async () => {
    if (!authQuery) return;
    const [tr, ex] = await Promise.all([api.getTrips(authQuery), api.getExpenses(authQuery)]);
    setTrips(tr);
    setExpenses(ex);
  }, [authQuery]);

  const refreshDriversAndAssignments = useCallback(async () => {
    if (!authQuery) return;
    const requests = [api.getDrivers(authQuery)];
    if (authUser?.role === "user" || authUser?.role === "driver") {
      requests.push(api.getDriverAssignments(authQuery));
    }
    const results = await Promise.all(requests);
    setDrivers(results[0]);
    if (results[1]) {
      setDriverAssignments(results[1]);
      assignmentsLoadedRef.current = true;
    }
  }, [authQuery, authUser?.role]);

  const refreshLorries = useCallback(async () => {
    if (!authQuery) return;
    setLorries(await api.getLorries(authQuery));
  }, [authQuery]);

  const expenseTotalsByTrip = useMemo(() => buildExpenseTotalsByTrip(expenses), [expenses]);

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
  const filteredAssignments = useMemo(() => {
    if (!driverFilterId) return driverAssignments;
    return driverAssignments.filter((item) => String(item.driver_id) === String(driverFilterId));
  }, [driverAssignments, driverFilterId]);
  const filteredDrivers = useMemo(() => {
    if (!driverFilterId) return drivers;
    return drivers.filter((driver) => String(driver.id) === String(driverFilterId));
  }, [drivers, driverFilterId]);
  const activeTripCount = useMemo(
    () => filteredTrips.filter((trip) => trip.status !== "Delivered" && trip.status !== "Trip Done").length,
    [filteredTrips]
  );
  const headerStats = useMemo(
    () => [
      { label: t("Fleet"), value: filteredDashboard?.total_lorries ?? lorries.length },
      { label: t("Trips Live"), value: activeTripCount },
      { label: t("Drivers"), value: driversForFilter.length || drivers.length }
    ],
    [activeTripCount, filteredDashboard, driversForFilter.length, drivers.length, lorries.length, language]
  );
  const filterTabs = useMemo(() => new Set(["Dashboard", "Done", "Contacts", "Reports", "Trips"]), []);
  const profilePeriodSummary = useMemo(
    () => ({
      periodLabel: getPeriodLabel(periodFilter, language),
      trips: filteredTrips.length,
      income: filteredDashboard.total_income,
      profit: filteredDashboard.total_profit
    }),
    [periodFilter, language, filteredTrips.length, filteredDashboard]
  );

  useEffect(() => {
    setDriverFilterId("");
  }, [selectedScopeUser]);

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
      setDrivers([]);
      setLorries([]);
      setTrips([]);
      setExpenses([]);
      setDriverAssignments([]);
      assignmentsLoadedRef.current = false;
      return;
    }
    assignmentsLoadedRef.current = false;
    refresh({ includeAssignments: authUser.role === "user" || authUser.role === "driver" }).catch(console.error);
  }, [authUser, selectedScopeUser, refresh]);

  useEffect(() => {
    if (!authUser || authUser.role !== "user" || !authQuery) {
      setNotifications([]);
      return;
    }
    loadNotifications().catch(() => {});
  }, [authUser, authQuery]);

  useEffect(() => {
    if (activeTab !== "Trips" || authUser?.role !== "user" || !authQuery) return;
    if (assignmentsLoadedRef.current) return;
    api
      .getDriverAssignments(authQuery)
      .then((asg) => {
        setDriverAssignments(asg);
        assignmentsLoadedRef.current = true;
      })
      .catch(console.error);
  }, [activeTab, authUser?.role, authQuery]);

  async function submitTrip() {
    if (authUser?.role !== "user" && authUser?.role !== "driver") return;

    const proofImages = [
      tripForm.diesel_image_url
        ? { category: "Diesel", name: "Diesel bill", data_url: tripForm.diesel_image_url }
        : null,
      tripForm.toll_image_url
        ? { category: "Toll", name: "Toll bill", data_url: tripForm.toll_image_url }
        : null,
      tripForm.puncture_image_url
        ? { category: "Puncture", name: "Puncture proof", data_url: tripForm.puncture_image_url }
        : null,
      tripForm.repair_image_url
        ? { category: "Repair", name: "Repair proof", data_url: tripForm.repair_image_url }
        : null,
      tripForm.other_image_url
        ? { category: "Other", name: "Other proof", data_url: tripForm.other_image_url }
        : null
    ].filter(Boolean);

    const createdTrip = await api.createTrip({
      ...tripForm,
      lorry_id: Number(tripForm.lorry_id),
      driver_id: authUser?.role === "driver" ? Number(authUser.driver_id) : Number(tripForm.driver_id),
      loading_date: tripForm.loading_date || null,
      unloading_date: tripForm.unloading_date || null,
      load_price: Number(tripForm.load_price)
    }, authQuery);

    await api.createExpense({
      trip_id: Number(createdTrip.id),
      diesel: roundMoney(tripForm.diesel),
      toll: roundMoney(tripForm.toll),
      driver_bata: roundMoney(tripForm.driver_bata),
      driver_daily_wage: roundMoney(tripForm.driver_daily_wage),
      driver_commission_percent: roundMoney(tripForm.driver_commission_percent),
      driver_commission_amount: roundMoney(tripForm.driver_commission_amount),
      maintenance: roundMoney(roundMoney(tripForm.puncture) + roundMoney(tripForm.repair)),
      other: roundMoney(tripForm.other_expense),
      proof_images: proofImages
    }, authQuery);

    setTripForm({
      lorry_id: "",
      driver_id: authUser?.role === "driver" ? String(authUser.driver_id || "") : "",
      load_location: "",
      unload_location: "",
      contact_person_name: "",
      contact_person_phone: "",
      loading_date: "",
      unloading_date: "",
      load_type: "",
      load_price: "",
      status: "Loading",
      diesel: "",
      toll: "",
      driver_bata: "",
      driver_daily_wage: "",
      driver_commission_percent: "",
      driver_commission_amount: "",
      puncture: "",
      repair: "",
      other_expense: "",
      diesel_image_url: "",
      toll_image_url: "",
      puncture_image_url: "",
      repair_image_url: "",
      other_image_url: ""
    });

    await refreshTripsAndExpenses();
  }

  async function saveLorry() {
    if (authUser?.role !== "user") return;
    await api.createLorry({
      vehicle_number: lorryForm.vehicle_number,
      current_location: "",
      driver_id: lorryForm.driver_id
    }, authQuery);
    setLorryForm({ vehicle_number: "", lorry_type: "Open Body", driver_id: null });
    await Promise.all([refreshLorries(), refreshTripsAndExpenses()]);
  }

  async function addDriver() {
    if (authUser?.role !== "user") return;
    setDriverSaveError("");
    if (!driverForm.name?.trim() || !driverForm.phone?.trim()) {
      const msg =
        language === "te" ? "పేరు మరియు ఫోన్ అవసరం." : "Driver name and phone are required.";
      setDriverSaveError(msg);
      Alert.alert(language === "te" ? "అవసరం" : "Required", msg);
      return;
    }
    const loginId = (driverForm.login_identifier || "").trim().toLowerCase();
    if (loginId.length >= 3) {
      try {
        const check = await api.checkUserId(loginId);
        if (!check.available) {
          const msg =
            check.message ||
            (language === "te" ? "లాగిన్ ID ఇప్పటికే ఉంది" : "Login ID already exists");
          setDriverSaveError(msg);
          Alert.alert(language === "te" ? "లాగిన్ ID లేదు" : "Login ID unavailable", msg);
          return;
        }
      } catch {
        /* allow server validation if check fails */
      }
    }
    try {
      const created = await api.createDriver(
        {
          ...driverForm,
          login_identifier: loginId || driverForm.login_identifier
        },
        authQuery
      );
      setDriverForm({ name: "", phone: "", license_number: "", login_identifier: "", password: "" });
      setDriverSaveError("");
      await refreshDriversAndAssignments();
      const passwordLine = created.initial_password
        ? (language === "te" ? `పాస్‌వర్డ్: ${created.initial_password} (ఆటో)` : `Password: ${created.initial_password} (auto)`)
        : language === "te"
          ? "మీరు ఇచ్చిన పాస్‌వర్డ్"
          : "Password set by you";
      Alert.alert(
        language === "te" ? "డ్రైవర్ సేవ్ అయ్యారు" : "Driver saved",
        `${created.name}\n${language === "te" ? "లాగిన్ ID" : "Login ID"}: ${created.login_identifier}\n${passwordLine}`
      );
    } catch (error) {
      const msg = parseApiError(
        error,
        "Failed to save driver",
        "డ్రైవర్ సేవ్ విఫలమైంది"
      );
      setDriverSaveError(msg);
      Alert.alert(language === "te" ? "లోపం" : "Error", msg);
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

  async function toggleDriverStatus(driver) {
    if (authUser?.role !== "user") return;
    await api.updateDriverStatus(driver.id, !driver.is_active, authQuery);
    if (selectedDriver?.id === driver.id) {
      await openDriverDetail({ ...driver, is_active: !driver.is_active });
    }
    await refreshDriversAndAssignments();
  }

  async function deleteDriver(driver) {
    if (authUser?.role !== "user") return;
    const confirmMsg =
      language === "te"
        ? `${driver.name} ను తొలగించాలా? ఈ డ్రైవర్ ట్రిప్ చరిత్ర, అసైన్‌మెంట్లు మరియు లాగిన్ కూడా తొలగించబడతాయి.`
        : `Delete ${driver.name}? Their trip history, assignments, and login will also be removed.`;
    Alert.alert(
      language === "te" ? "డ్రైవర్ తొలగింపు" : "Delete driver",
      confirmMsg,
      [
        { text: language === "te" ? "రద్దు" : "Cancel", style: "cancel" },
        {
          text: language === "te" ? "తొలగించు" : "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteDriver(driver.id, authQuery);
              if (selectedDriver?.id === driver.id) {
                closeDriverDetail();
              }
              await refreshDriversAndAssignments();
            } catch (error) {
              Alert.alert(
                language === "te" ? "లోపం" : "Error",
                parseApiError(error, "Failed to delete driver.", "డ్రైవర్ తొలగింపు విఫలమైంది.")
              );
            }
          }
        }
      ]
    );
  }

  async function openLorryHistory(lorry) {
    const history = await api.getLorryHistory(lorry.id, authQuery);
    setSelectedLorryHistory(history);
  }

  async function toggleLorryStatus(lorry) {
    if (authUser?.role !== "user") return;
    await api.updateLorryStatus(lorry.id, !lorry.is_active, authQuery);
    if (selectedLorryHistory?.lorry_id === lorry.id) {
      const latest = await api.getLorryHistory(lorry.id, authQuery);
      setSelectedLorryHistory(latest);
    }
    await Promise.all([refreshLorries(), refreshTripsAndExpenses()]);
  }

  function parseApiError(error, fallbackEn, fallbackTe) {
    return parseApiDetail(error, language === "te" ? fallbackTe : fallbackEn);
  }

  async function handleLogin(payload) {
    try {
      setIsLoggingIn(true);
      setLoginError("");
      let user;

      if (payload?.register) {
        if ((payload.password || "") !== (payload.confirm_password || "")) {
          setLoginError(language === "te" ? "పాస్‌వర్డ్‌లు సరిపోలలేదు" : "Passwords do not match");
          return;
        }
        user = await api.registerUser({
          identifier: (payload.identifier || "").trim().toLowerCase(),
          phone: payload.phone,
          email: payload.email,
          preferred_language: payload.preferred_language || language || "en",
          password: payload.password,
          confirm_password: payload.confirm_password
        });
        Alert.alert(
          language === "te" ? "అకౌంట్ సృష్టించబడింది" : "Account created",
          `${language === "te" ? "మీ యూజర్ ID" : "Your User ID"}: ${user.identifier}\n${language === "te" ? "దీనితో లాగిన్ అవ్వండి." : "Use this to sign in."}`
        );
      } else {
        const normalizedId = (payload?.identifier ?? loginForm.identifier ?? "").trim().toLowerCase();
        user = await api.login({
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
      }

      setAuthUser(user);
      await AsyncStorage.setItem("fleet_auth_user", JSON.stringify(user));
      if (user.role === "driver" && user.driver_id) {
        setTripForm((prev) => ({ ...prev, driver_id: String(user.driver_id) }));
      }
      const existingProfile = await api.getUserProfile(user.identifier);
      setProfile(existingProfile);

      if (existingProfile) {
        const preferredLanguage = existingProfile.preferred_language || language || "en";
        setLanguagePreference(preferredLanguage);
        setProfileForm({
          full_name: existingProfile.full_name || "",
          phone: existingProfile.phone || "",
          email: existingProfile.email || "",
          profile_image_url: existingProfile.profile_image_url || "",
          preferred_language: preferredLanguage
        });
      }

      payload?.onDone?.();
      setActiveTab("Dashboard");
    } catch (error) {
      setLoginError(
        parseApiError(
          error,
          payload?.register ? "Registration failed" : "Invalid username or password",
          payload?.register ? "నమోదు విఫలమైంది" : "లాగిన్ విఫలమైంది"
        )
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleForgotPassword(identifier, newPassword, onDone) {
    try {
      await api.forgotPassword({ identifier, new_password: newPassword });
      Alert.alert("Success", language === "te" ? "పాస్‌వర్డ్ రీసెట్ అయింది." : "Password reset successful.");
      onDone?.();
    } catch (error) {
      Alert.alert("Error", error.message || "Password reset failed");
    }
  }

  async function loginAsUser(targetIdentifier) {
    if (!authUser || authUser.role !== "admin" || !targetIdentifier) return;
    try {
      await AsyncStorage.setItem("fleet_admin_backup", JSON.stringify(authUser));
      const userSession = await api.loginAsUser(
        { target_identifier: targetIdentifier },
        { viewer: authUser.identifier, role: "admin" }
      );
      setAuthUser(userSession);
      await AsyncStorage.setItem("fleet_auth_user", JSON.stringify(userSession));
      setSelectedScopeUser("");
      const existingProfile = await api.getUserProfile(userSession.identifier);
      setProfile(existingProfile);
      setActiveTab("Dashboard");
    } catch (error) {
      Alert.alert("Error", error.message || "Could not login as user");
    }
  }

  async function exitImpersonation() {
    const backup = await AsyncStorage.getItem("fleet_admin_backup");
    if (!backup) return;
    const adminSession = JSON.parse(backup);
    setAuthUser(adminSession);
    await AsyncStorage.setItem("fleet_auth_user", JSON.stringify(adminSession));
    await AsyncStorage.removeItem("fleet_admin_backup");
    setProfile(null);
    setActiveTab("Dashboard");
  }

  function handleLogout() {
    if (authUser?.acting_as_admin) {
      exitImpersonation();
      return;
    }
    setIsProfileOpen(false);
    setAuthUser(null);
    setScopeUsers([]);
    setSelectedScopeUser("");
    AsyncStorage.removeItem("fleet_auth_user").catch(() => {});
    AsyncStorage.removeItem("fleet_admin_backup").catch(() => {});
    assignmentsLoadedRef.current = false;
    setDrivers([]);
    setLorries([]);
    setTrips([]);
    setExpenses([]);
    setDriverAssignments([]);
    setProfile(null);
    setProfileForm({ full_name: "", phone: "", email: "", profile_image_url: "", preferred_language: language });
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
      setLanguagePreference(saved.preferred_language || profileForm.preferred_language || language || "en");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function assignDriverToLorry() {
    if (authUser?.role !== "user") return;
    if (!assignmentForm.driver_id || !assignmentForm.lorry_id) return;

    await api.createDriverAssignment({
      driver_id: Number(assignmentForm.driver_id),
      lorry_id: Number(assignmentForm.lorry_id),
      assigned_at: assignmentForm.assigned_at || null,
      daily_wage: Number(assignmentForm.daily_wage || 0),
      commission_percent: Number(assignmentForm.commission_percent || 0),
      notes: assignmentForm.notes || null
    }, authQuery);

    setAssignmentForm({ lorry_id: "", driver_id: "", assigned_at: "", daily_wage: "", commission_percent: "6", notes: "" });
    await refreshDriversAndAssignments();
  }

  async function completeAssignment(assignmentId, payload = {}) {
    if (authUser?.role !== "user") return;
    await api.completeDriverAssignment(assignmentId, payload, authQuery);
    await refreshDriversAndAssignments();
  }

  async function addAssignmentLeave(assignmentId, payload) {
    if (authUser?.role !== "user") return;
    await api.addDriverAssignmentLeave(assignmentId, payload, authQuery);
    await refreshDriversAndAssignments();
  }

  async function acceptDriverAssignment(assignmentId) {
    if (authUser?.role !== "driver") return;
    await api.acceptDriverAssignment(assignmentId, authQuery);
    await refresh({ includeAssignments: true });
  }

  async function loadNotifications() {
    if (!authQuery || authUser?.role !== "user") return;
    const items = await api.getNotifications(authQuery).catch(() => []);
    setNotifications(items || []);
  }

  async function updateTrip(tripId, payload) {
    await api.updateTrip(tripId, payload, authQuery);
    await refreshTripsAndExpenses();
  }

  function renderFilters() {
    if (!filterTabs.has(activeTab) || activeTab === "Add") return null;
    if (authUser?.role === "admin" && !selectedScopeUser) return null;

    return (
      <View style={styles.filtersWrap}>
        <PeriodFilterBar value={periodFilter} onChange={setPeriodFilter} language={language} />
        {authUser?.role === "driver" ? null : (
          <DriverFilterBar
            drivers={driversForFilter}
            value={driverFilterId}
            onChange={setDriverFilterId}
            language={language}
            tripCounts={driverTripCounts}
          />
        )}
      </View>
    );
  }

  function renderPrimaryTab() {
    if (authUser?.role === "admin" && !selectedScopeUser) {
      return (
        <View style={styles.profileCard}>
          <Text style={styles.profileIdentity}>
            {language === "te" ? "యూజర్‌ను ఎంచుకోండి" : "Select a user"}
          </Text>
          <Text style={styles.profileHint}>
            {language === "te"
              ? "పైన ఉన్న యూజర్ బటన్‌ను ఎంచుకుంటే ఆ యూజర్ డేటా మాత్రమే చూపబడుతుంది."
              : "Choose a user above to view only that user's fleet data."}
          </Text>
        </View>
      );
    }

    if (authUser?.role === "admin" && userActionTabs.has(activeTab)) {
      return (
        <View style={styles.profileCard}>
          <View style={styles.profileHero}>
            <View style={styles.profileAvatarWrap}>
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.profileAvatarImage} />
              ) : (
                <View style={styles.profileAvatarFallback}>
                  <Text style={styles.profileAvatarFallbackText}>{profileInitial}</Text>
                </View>
              )}
            </View>
            <View style={styles.profileHeroCopy}>
              <Text style={styles.profileIdentity}>{profileForm.full_name || authUser?.identifier}</Text>
              <Text style={styles.profileIdentitySub}>
                {authUser?.role === "admin"
                  ? translate(language, "Admin workspace", "అడ్మిన్ వర్క్‌స్పేస్")
                  : translate(language, "User workspace", "యూజర్ వర్క్‌స్పేస్")}
              </Text>
            </View>
          </View>
          <Text style={styles.profileKicker}>
            {translate(language, "ADMIN VIEW", "అడ్మిన్ వీక్")}
          </Text>
          <Text style={styles.profileTitle}>{language === "te" ? "అనుమతి లేదు" : "Access restricted"}</Text>
          <Text style={styles.profileHint}>
            {language === "te"
              ? "ఈ భాగం యూజర్ చర్యల కోసం మాత్రమే అందుబాటులో ఉంటుంది."
              : "This section is available for user operations only."}
          </Text>
        </View>
      );
    }

    if (activeTab === "Trips") {
      return (
        <MemoDriverManagementScreen
          drivers={filteredDrivers.length ? filteredDrivers : drivers}
          lorries={lorries}
          assignments={filteredAssignments}
          form={driverForm}
          setForm={(next) => {
            setDriverForm(next);
            if (driverSaveError) setDriverSaveError("");
          }}
          saveError={driverSaveError}
          onAddDriver={addDriver}
          onOpenDetail={openDriverDetail}
          onToggleDriverStatus={toggleDriverStatus}
          onDeleteDriver={deleteDriver}
          assignmentForm={assignmentForm}
          setAssignmentForm={setAssignmentForm}
          onAssign={assignDriverToLorry}
          onAddAssignmentLeave={addAssignmentLeave}
          onCompleteAssignment={completeAssignment}
          language={language}
        />
      );
    }

    if (activeTab === "Reports") {
      const firstTrip = filteredTrips[0];
      const firstExpense = firstTrip ? expenseTotalsByTrip[firstTrip.id] : null;
      return (
        <>
          {authUser?.role === "user" && firstTrip ? (
            <MemoProfitSummaryScreen trip={firstTrip} expense={firstExpense} language={language} />
          ) : null}
          <MemoReportsScreen
            dashboard={filteredDashboard}
            trips={filteredTrips}
            language={language}
            periodFilter={periodFilter}
            userRole={authUser?.role}
            expenseTotalsByTrip={expenseTotalsByTrip}
            notifications={notifications}
          />
        </>
      );
    }

    if (activeTab === "Done") {
      return (
        <MemoDoneTripsScreen
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

    if (activeTab === "Contacts") {
      return (
        <MemoTripContactsScreen
          trips={filteredTrips}
          drivers={drivers}
          language={language}
          periodFilter={periodFilter}
        />
      );
    }

    if (activeTab === "Add") {
      if (authUser?.role === "driver") {
        return (
          <MemoCreateTripScreen
            form={tripForm}
            setForm={setTripForm}
            lorries={lorries}
            drivers={drivers}
            onStartTrip={submitTrip}
            language={language}
            lockedDriverId={authUser.driver_id}
          />
        );
      }
      return (
        <>
          <MemoAddLorryScreen
            form={lorryForm}
            setForm={setLorryForm}
            drivers={drivers}
            lorries={lorries}
            selectedLorryHistory={selectedLorryHistory}
            onSelectLorry={openLorryHistory}
            onToggleLorryStatus={toggleLorryStatus}
            onSave={saveLorry}
            onCancel={() => setLorryForm({ vehicle_number: "", lorry_type: "Open Body", driver_id: null })}
            language={language}
          />
          <MemoCreateTripScreen
            form={tripForm}
            setForm={setTripForm}
            lorries={lorries}
            drivers={drivers}
            onStartTrip={submitTrip}
            language={language}
          />
        </>
      );
    }

    return (
      <MemoDashboardScreen
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

  useEffect(() => {
    if (authUser?.role === "admin" && userActionTabs.has(activeTab)) {
      setActiveTab("Dashboard");
    }
  }, [activeTab, authUser]);

  useEffect(() => {
    if (activeTab !== "Trips") {
      closeDriverDetail();
    }
  }, [activeTab]);

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [activeTab]);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((storedLanguage) => {
        if (storedLanguage === "en" || storedLanguage === "te") {
          setLanguage(storedLanguage);
          setProfileForm((prev) => ({ ...prev, preferred_language: storedLanguage }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrapSession() {
      try {
        const stored = await AsyncStorage.getItem("fleet_auth_user");
        if (!stored) {
          return;
        }

        let parsedUser;
        try {
          parsedUser = JSON.parse(stored);
        } catch (_error) {
          await AsyncStorage.removeItem("fleet_auth_user").catch(() => {});
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
            setLanguagePreference(preferredLanguage);
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
        await AsyncStorage.removeItem("fleet_auth_user").catch(() => {});
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

  if (!isSessionReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{language === "te" ? "లోడ్ అవుతోంది..." : "Loading workspace..."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!authUser) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={[styles.container, styles.centered, styles.loginPage]}>
          <LoginScreen
            form={loginForm}
            setForm={setLoginForm}
            language={language}
            onLogin={handleLogin}
            onForgotPassword={handleForgotPassword}
            loading={isLoggingIn}
            error={loginError}
          />
        </View>
      </SafeAreaView>
    );
  }

  const needsProfileSetup =
    (authUser.role === "user" || authUser.role === "driver") && !profile?.full_name?.trim();

  function openProfileSettings() {
    setIsProfileOpen(true);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.headerWrap}>
          <View style={styles.headerBar}>
            <Pressable
              style={styles.headerIconBtn}
              onPress={() => setIsNavOpen((prev) => !prev)}
              accessibilityLabel={language === "te" ? (isNavOpen ? CLOSE_NAV_LABEL : OPEN_NAV_LABEL) : (isNavOpen ? "Hide navigation" : "Show navigation")}
            >
              <MaterialCommunityIcons name={isNavOpen ? "close" : "menu"} size={18} color={colors.text} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {activeTab === "Dashboard" ? t("Dashboard") : t(activeTab)}
              </Text>
              <Text style={styles.headerMeta} numberOfLines={1}>
                {authUser?.role === "admin"
                  ? (selectedScopeUser || (language === "te" ? "యూజర్ ఎంచుకోండి" : "Select user"))
                  : headerDate}
              </Text>
              {tabHints[activeTab] ? (
                <Text style={styles.headerHint} numberOfLines={2}>
                  {language === "te" ? tabHints[activeTab].te : tabHints[activeTab].en}
                </Text>
              ) : null}
            </View>
            <Pressable style={styles.avatarBadge} onPress={openProfileSettings}>
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarBadgeText}>{profileInitial}</Text>
              )}
            </Pressable>
          </View>

          {activeTab === "Dashboard" ? (
            <View style={styles.quickStats}>
              {headerStats.map((item) => (
                <View key={item.label} style={styles.quickStat}>
                  <Text style={styles.quickStatLabel}>{item.label}</Text>
                  <Text style={styles.quickStatValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {authUser?.role === "admin" ? (
          <View style={styles.scopeUserWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopeUserRow}>
              {scopeUsers.map((user) => {
                const active = selectedScopeUser === user.identifier;
                return (
                  <Pressable
                    key={user.identifier}
                    style={[styles.scopeUserChip, active && styles.scopeUserChipActive]}
                    onPress={() => setSelectedScopeUser(user.identifier)}
                  >
                    <Text style={[styles.scopeUserChipText, active && styles.scopeUserChipTextActive]}>
                      {user.full_name || user.identifier}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {selectedScopeUser ? (
              <Pressable style={styles.loginAsUserBtn} onPress={() => loginAsUser(selectedScopeUser)}>
                <Text style={styles.loginAsUserBtnText}>
                  {language === "te" ? "యూజర్‌గా లాగిన్" : "Login as user"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {authUser?.acting_as_admin ? (
          <Pressable style={styles.loginAsUserBtn} onPress={exitImpersonation}>
            <Text style={styles.loginAsUserBtnText}>
              {language === "te" ? "అడ్మిన్‌కు తిరిగి" : "Back to admin"}
            </Text>
          </Pressable>
        ) : null}

        <ScrollView
          ref={contentScrollRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {needsProfileSetup ? (
            <Pressable style={styles.profileSetupBanner} onPress={openProfileSettings}>
              <View style={styles.profileSetupBannerCopy}>
                <Text style={styles.profileSetupBannerTitle}>
                  {language === "te" ? "ప్రొఫైల్ పూర్తి చేయండి" : "Complete your profile"}
                </Text>
                <Text style={styles.profileSetupBannerText}>
                  {language === "te"
                    ? "మీ పేరు మరియు వివరాలను ప్రొఫైల్‌లో చేర్చండి."
                    : "Add your name and details from your profile."}
                </Text>
              </View>
              <Text style={styles.profileSetupBannerAction}>
                {language === "te" ? "తెరువు ›" : "Open ›"}
              </Text>
            </Pressable>
          ) : null}
          {renderFilters()}
          {renderPrimaryTab()}
        </ScrollView>

        <ProfileSettingsModal
          visible={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          language={language}
          authUser={authUser}
          form={profileForm}
          setForm={setProfileForm}
          profileImageUrl={profileImageUrl}
          profileInitial={profileInitial}
          needsSetup={needsProfileSetup}
          onSave={async () => {
            if (!profileForm.full_name?.trim()) return;
            await saveProfile();
            setIsProfileOpen(false);
          }}
          onLogout={handleLogout}
          onLanguageChange={setLanguagePreference}
          onSelectImage={() => handleProfileImageSelection("library")}
          onCaptureImage={() => handleProfileImageSelection("camera")}
          loading={isSavingProfile}
          periodSummary={profilePeriodSummary}
        />

        <Modal visible={Boolean(selectedDriver)} transparent animationType="fade" onRequestClose={closeDriverDetail}>
          <View style={styles.driverModalBackdrop}>
            <View style={styles.driverModalCard}>
              <View style={styles.driverModalHead}>
                <Text style={styles.driverModalTitle}>{language === "te" ? "డ్రైవర్ వివరాలు" : "Driver Detail"}</Text>
                <View style={styles.driverModalActions}>
                  {authUser?.role === "user" ? (
                    <Pressable style={styles.driverModalDeleteBtn} onPress={() => deleteDriver(selectedDriver)}>
                      <Text style={styles.driverModalDeleteText}>{language === "te" ? "తొలగించు" : "Delete"}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.driverModalCloseBtn} onPress={closeDriverDetail}>
                    <Text style={styles.driverModalCloseText}>{language === "te" ? "మూసివేయి" : "Close"}</Text>
                  </Pressable>
                </View>
              </View>
              <ScrollView
                contentContainerStyle={styles.driverModalContent}
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
              >
                <DriverDetailScreen driver={selectedDriver} history={selectedDriverHistory} language={language} />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {isNavOpen ? (
          <View style={styles.bottomNav}>
            {tabs.map((tab) => {
              const active = activeTab === tab;
              return (
                <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.navItem, active && styles.navItemActive]}>
                  <MaterialCommunityIcons
                    name={bottomTabIcons[tab] || "circle-outline"}
                    size={18}
                    color={active ? colors.primary : colors.muted}
                  />
                  <Text style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                    {t(tab)}
                  </Text>
                  {active ? <View style={styles.navIndicator} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  if (FORCE_WEB_UI) {
    return <WebUiMirror />;
  }
  return <FleetWorkspaceApp />;
}

const styles = StyleSheet.create({
  webMirrorSafeArea: { flex: 1, backgroundColor: "#fff" },
  webMirrorFrame: { flex: 1, width: "100%", height: "100%", borderWidth: 0 },
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingTop: 6
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    gap: 8
  },
  loginPage: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background
  },
  loadingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  headerWrap: {
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 4
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  quickStats: {
    flexDirection: "row",
    gap: 4
  },
  quickStat: {
    flex: 1,
    flexDirection: "column",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 56
  },
  quickStatLabel: {
    fontSize: typography.xs,
    fontWeight: "700",
    color: colors.muted
  },
  quickStatValue: {
    fontSize: typography.md,
    fontWeight: "800",
    color: colors.text,
    marginTop: 2
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  headerCopy: { flex: 1, gap: 1 },
  headerTitle: {
    fontSize: typography.lg,
    fontWeight: "800",
    color: colors.text,
    lineHeight: 22,
    letterSpacing: -0.3
  },
  headerMeta: {
    fontSize: typography.xs,
    color: colors.muted,
    fontWeight: "600",
    lineHeight: 16
  },
  headerHint: {
    fontSize: typography.sm,
    color: colors.textSoft,
    lineHeight: 18,
    marginTop: 4
  },
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatarBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800"
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  content: {
    paddingTop: 8,
    paddingBottom: 62,
    paddingHorizontal: 4,
    gap: 12
  },
  filtersWrap: {
    gap: 6,
    marginBottom: 2
  },
  bottomNav: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5
  },
  navItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 2,
    minHeight: 40,
    borderRadius: radius.sm
  },
  navItemActive: {
    backgroundColor: colors.primarySoft
  },
  navLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.muted,
    lineHeight: 11
  },
  navLabelActive: {
    color: colors.primaryDark,
    fontWeight: "800"
  },
  navIndicator: {
    width: 14,
    height: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  profileKicker: {
    fontSize: 11,
    letterSpacing: 1.3,
    color: "#0F766E",
    fontWeight: "800"
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text
  },
  profileHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  profileAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: "hidden"
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%"
  },
  profileAvatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  profileAvatarFallbackText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800"
  },
  profileHeroCopy: {
    flex: 1,
    gap: 4
  },
  profileIdentity: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  profileIdentitySub: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "700"
  },
  profileHint: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16
  },
  profileStatsRow: {
    flexDirection: "row",
    gap: 6
  },
  profileStatCard: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  profileStatLabel: {
    color: colors.muted,
    fontSize: 11.5,
    fontWeight: "700",
    marginBottom: 4
  },
  profileStatValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  profileFieldBlock: { gap: 6 },
  profileLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSoft
  },
  profileInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.text
  },
  profileMetaCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: 4
  },
  profileMetaLabel: {
    color: colors.primaryDark,
    fontSize: 11.5,
    fontWeight: "700"
  },
  profileMetaValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  profileLangRow: {
    flexDirection: "row",
    gap: 8
  },
  profileLangChip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted
  },
  profileLangChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted
  },
  profileLangChipText: {
    color: colors.primaryDark,
    fontWeight: "700",
    fontSize: 12
  },
  profileLangChipTextActive: {
    fontWeight: "900"
  },
  profileImageActionRow: {
    flexDirection: "row",
    gap: 8
  },
  profileImageBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10
  },
  profileImageBtnText: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: 12
  },
  profileSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4
  },
  profileSaveBtnDisabled: {
    backgroundColor: colors.mutedSoft
  },
  profileSaveText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13
  },
  profileLogoutBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#F4C7A5"
  },
  profileLogoutText: {
    color: "#9A3412",
    fontWeight: "800",
    fontSize: 12
  },
  driverModalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: 16
  },
  driverModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxHeight: "85%",
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6
  },
  driverModalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 12
  },
  driverModalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: colors.text,
    flex: 1
  },
  driverModalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  driverModalDeleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2"
  },
  driverModalDeleteText: {
    color: colors.danger,
    fontWeight: "800",
    fontSize: 12
  },
  driverModalCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceMuted
  },
  driverModalCloseText: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: 12
  },
  driverModalContent: { paddingBottom: 6 },
  scopeUserWrap: { gap: 4, marginBottom: 4 },
  scopeUserRow: {
    gap: 4,
    paddingBottom: 4,
    paddingRight: 2
  },
  loginAsUserBtn: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4
  },
  loginAsUserBtnText: {
    color: colors.primaryDark,
    fontWeight: "800",
    fontSize: 11
  },
  scopeUserChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  scopeUserChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  scopeUserChipText: {
    color: colors.textSoft,
    fontWeight: "700",
    fontSize: 12
  },
  scopeUserChipTextActive: {
    color: colors.primaryDark
  },
  profileSetupBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  profileSetupBannerCopy: {
    flex: 1,
    gap: 2
  },
  profileSetupBannerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.primaryDark
  },
  profileSetupBannerText: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSoft,
    fontWeight: "600"
  },
  profileSetupBannerAction: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primaryDark
  }
});
