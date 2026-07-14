import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "fr" | "en" | "ar";
export type Theme = "dark" | "light";

type Settings = {
  lang: Lang;
  theme: Theme;
  accent: string; // hue 0-360
};

const DEFAULT: Settings = { lang: "en", theme: "dark", accent: "142" };
const KEY = "sprintlab_settings_v1";

type Ctx = Settings & {
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  setAccent: (hue: string) => void;
  t: (k: TKey) => string;
};

const SettingsContext = createContext<Ctx | null>(null);

const TR = {
  // ---- Settings dialog ----
  settings: { fr: "Paramètres", en: "Settings", ar: "الإعدادات" },
  language: { fr: "Langue", en: "Language", ar: "اللغة" },
  theme: { fr: "Thème", en: "Theme", ar: "المظهر" },
  appearance: { fr: "Apparence", en: "Appearance", ar: "المظهر العام" },
  dark: { fr: "Sombre", en: "Dark", ar: "داكن" },
  light: { fr: "Clair", en: "Light", ar: "فاتح" },
  accentColor: { fr: "Couleur d'accent", en: "Accent color", ar: "لون التمييز" },
  customHue: { fr: "Teinte personnalisée", en: "Custom hue", ar: "تدرج مخصص" },
  done: { fr: "Terminé", en: "Done", ar: "تم" },
  logout: { fr: "Déconnexion", en: "Sign out", ar: "تسجيل الخروج" },
  exportFolder: { fr: "Dossier d'export des rapports", en: "Reports export folder", ar: "مجلد تصدير التقارير" },
  chooseFolder: { fr: "Choisir un dossier", en: "Choose folder", ar: "اختر مجلداً" },
  resetFolder: { fr: "Réinitialiser", en: "Reset", ar: "إعادة تعيين" },
  defaultDownloads: { fr: "Téléchargements par défaut", en: "Default Downloads", ar: "التنزيلات الافتراضية" },
  folderNotSupported: { fr: "Non supporté sur ce navigateur — utilise Téléchargements", en: "Not supported in this browser — uses Downloads", ar: "غير مدعوم في هذا المتصفح — يستخدم التنزيلات" },
  savedTo: { fr: "Enregistré dans", en: "Saved to", ar: "تم الحفظ في" },
  openInNewTab: { fr: "Ouvrir dans un nouvel onglet", en: "Open in new tab", ar: "افتح في علامة تبويب جديدة" },
  iframeBlocked: { fr: "Sélection bloquée dans l'aperçu. Ouvrez l'app dans un nouvel onglet.", en: "Selection blocked in preview. Open the app in a new tab.", ar: "الاختيار محظور في المعاينة. افتح التطبيق في علامة تبويب جديدة." },
  browserUnsupported: { fr: "Navigateur non compatible. Utilisez Chrome ou Edge sur ordinateur.", en: "Browser not supported. Use Chrome or Edge on desktop.", ar: "المتصفح غير مدعوم. استخدم Chrome أو Edge على الكمبيوتر." },
 pickerCancelled: { fr: "Sélection annulée", en: "Selection cancelled", ar: "تم إلغاء الاختيار" },
 cancel: { fr: "Annuler", en: "Cancel", ar: "إلغاء" },

  // Cloud sync
  cloudBackup: { fr: "Synchronisation", en: "Sync", ar: "المزامنة" },
  cloudBackupDesc: { fr: "Vos données restent sur l'appareil. En un tap, envoyez une copie chiffrée vers le drive de votre téléphone.", en: "Your data stays on device. One tap sends an encrypted copy to your phone's drive.", ar: "تبقى بياناتك على الجهاز. بضغطة واحدة، أرسل نسخة مشفرة إلى مساحة التخزين السحابية." },
  backupICloud: { fr: "Sauvegarder sur iCloud Drive", en: "Back up to iCloud Drive", ar: "احفظ على iCloud Drive" },
  backupGDrive: { fr: "Sauvegarder sur Google Drive", en: "Back up to Google Drive", ar: "احفظ على Google Drive" },
  gdriveUnavailable: { fr: "Google Drive indisponible sur cette build. Utilisez le fichier .slfv.", en: "Google Drive unavailable in this build. Use the .slfv file.", ar: "‏Google Drive غير متاح في هذه النسخة. استخدم ملف .slfv." },
  useSlfvFile: { fr: "Utiliser un fichier .slfv à la place", en: "Use a .slfv file instead", ar: "استخدم ملف .slfv بدلاً من ذلك" },
  provider: { fr: "Provider", en: "Provider", ar: "المزوّد" },
  disable: { fr: "Désactiver", en: "Disable", ar: "إيقاف" },
  pull: { fr: "Récupérer", en: "Pull", ar: "استرجاع" },
  push: { fr: "Envoyer", en: "Push", ar: "إرسال" },
  sync: { fr: "Sync", en: "Sync", ar: "مزامنة" },
  iCloudHint: { fr: "Sur iPhone, choisissez « Enregistrer dans Fichiers » → iCloud Drive lors de l'envoi.", en: "On iPhone, choose \"Save to Files\" → iCloud Drive when exporting.", ar: "على iPhone، اختر «حفظ في الملفات» → iCloud Drive عند التصدير." },
  lastSync: { fr: "Dernière synchronisation", en: "Last sync", ar: "آخر مزامنة" },
  syncError: { fr: "Erreur de synchronisation", en: "Sync error", ar: "خطأ في المزامنة" },
  pulledOk: { fr: "Récupération OK", en: "Pulled OK", ar: "تم الاسترجاع" },
  pushedOk: { fr: "Sauvegarde envoyée", en: "Backup uploaded", ar: "تم رفع النسخة الاحتياطية" },
  syncDone: { fr: "Synchronisation terminée", en: "Sync completed", ar: "اكتملت المزامنة" },

  // ---- Nav ----
  navDashboard: { fr: "Tableau de bord", en: "Dashboard", ar: "الرئيسية" },
  navTeams: { fr: "Équipes", en: "Teams", ar: "الفرق" },
  navTests: { fr: "Tests", en: "Tests", ar: "الاختبارات" },
  back: { fr: "Retour", en: "Back", ar: "رجوع" },

  // ---- Dashboard ----
  hello: { fr: "Bonjour", en: "Hello", ar: "مرحباً" },
  tagline: { fr: "Votre labo de performance, dans votre poche.", en: "Your performance lab, in your pocket.", ar: "مختبر الأداء الخاص بك، في جيبك." },
  teams: { fr: "Équipes", en: "Teams", ar: "الفرق" },
  players: { fr: "Joueurs", en: "Players", ar: "اللاعبون" },
  tests: { fr: "Tests", en: "Tests", ar: "الاختبارات" },
  manageTeams: { fr: "Gérer les équipes", en: "Manage Teams", ar: "إدارة الفرق" },
  newTest: { fr: "Nouveau test", en: "New Test", ar: "اختبار جديد" },
  latestTest: { fr: "Dernier test", en: "Latest test", ar: "آخر اختبار" },
  getStarted: { fr: "Commencer", en: "Get started", ar: "ابدأ الآن" },
  getStartedDesc: { fr: "Créez votre première équipe pour ajouter des athlètes et des tests.", en: "Create your first team to start adding players and tests.", ar: "أنشئ فريقك الأول لإضافة اللاعبين والاختبارات." },
  createTeam: { fr: "Créer une équipe", en: "Create a team", ar: "إنشاء فريق" },
  verticalJump: { fr: "Saut vertical", en: "Vertical jump", ar: "القفز العمودي" },
  linearSprint: { fr: "Sprint linéaire", en: "Linear sprint", ar: "العدو الخطي" },
  sprint: { fr: "Sprint", en: "Sprint", ar: "عدو" },
  jump: { fr: "Saut", en: "Jump", ar: "قفز" },

  // ---- Tests list / new ----
  allTests: { fr: "Tous les tests", en: "All tests", ar: "كل الاختبارات" },
  acrossOrg: { fr: "Sur toute votre organisation.", en: "Across your organisation.", ar: "عبر المنظمة بأكملها." },
  new: { fr: "Nouveau", en: "New", ar: "جديد" },
  noTests: { fr: "Aucun test enregistré pour le moment.", en: "No tests recorded yet.", ar: "لا توجد اختبارات مسجلة بعد." },
  launchTest: { fr: "Lancer un test", en: "Launch a test", ar: "بدء اختبار" },
  chooseTestType: { fr: "Choisissez le type de test pour commencer.", en: "Choose the test type to get started.", ar: "اختر نوع الاختبار للبدء." },
  dashboard: { fr: "Tableau de bord", en: "Dashboard", ar: "الرئيسية" },

  // ---- Auth ----
  localFirst: { fr: "\n", en: "Local-first · Private by default", ar: "محلي أولاً · خاص افتراضياً" },
  createProfile: { fr: "\n", en: "Create your profile", ar: "أنشئ ملفك الشخصي" },
  yourName: { fr: "Votre nom", en: "Your name", ar: "اسمك" },
  createMyProfile: { fr: "Créer mon profil", en: "Create my profile", ar: "أنشئ ملفي" },
  nameTeamRequired: { fr: "Nom et équipe requis.", en: "Name and team required.", ar: "الاسم والفريق مطلوبان." },
  profileCreated: { fr: "Profil créé.", en: "Profile created.", ar: "تم إنشاء الملف." },
  storageNote: { fr: "\n", en: "100% local storage · No online sign-up", ar: "تخزين محلي 100% · بدون تسجيل عبر الإنترنت" },

  // ---- Teams page ----
  teamsSubtitle: { fr: "Regroupez les athlètes par équipe ou session.", en: "Group athletes by squad or session.", ar: "جمّع الرياضيين حسب الفريق أو الجلسة." },
  createTeamTitle: { fr: "Créer une équipe", en: "Create team", ar: "إنشاء فريق" },
  teamName: { fr: "Nom de l'équipe", en: "Team name", ar: "اسم الفريق" },
  sport: { fr: "Sport", en: "Sport", ar: "الرياضة" },
  sportPlaceholder: { fr: "Athlétisme, Football, Rugby…", en: "Athletics, Football, Rugby…", ar: "ألعاب قوى، كرة قدم، رجبي…" },
  create: { fr: "Créer", en: "Create", ar: "إنشاء" },
  teamCreated: { fr: "Équipe créée", en: "Team created", ar: "تم إنشاء الفريق" },
  teamDeleted: { fr: "Équipe supprimée", en: "Team deleted", ar: "تم حذف الفريق" },
  noTeamsYet: { fr: "Aucune équipe — créez la première.", en: "No teams yet — create your first one.", ar: "لا توجد فرق بعد — أنشئ أول فريق." },
  deleteTeamConfirm: { fr: "Supprimer l'équipe et ses joueurs ?", en: "Delete team and its players?", ar: "حذف الفريق ولاعبيه؟" },
  deleteTeam: { fr: "Supprimer l'équipe", en: "Delete team", ar: "حذف الفريق" },
  player: { fr: "Joueur", en: "Player", ar: "لاعب" },
  playerAdded: { fr: "Joueur ajouté", en: "Player added", ar: "تمت إضافة اللاعب" },
  playerDeleted: { fr: "Joueur supprimé", en: "Player deleted", ar: "تم حذف اللاعب" },
  deletePlayer: { fr: "Supprimer le joueur", en: "Delete player", ar: "حذف اللاعب" },
  deletePlayerConfirm: { fr: "Supprimer ce joueur ?", en: "Delete this player?", ar: "حذف هذا اللاعب؟" },
  noPlayers: { fr: "Aucun joueur — ajoutez-en un.", en: "No players yet — add one.", ar: "لا يوجد لاعبون — أضف واحداً." },
  teamNotFound: { fr: "Équipe introuvable.", en: "Team not found.", ar: "الفريق غير موجود." },
  sportNotSet: { fr: "Sport non défini", en: "Sport not set", ar: "لم تُحدد الرياضة" },
  addPlayer: { fr: "Ajouter un joueur", en: "Add player", ar: "إضافة لاعب" },
  firstName: { fr: "Prénom", en: "First name", ar: "الاسم الأول" },
  lastName: { fr: "Nom", en: "Last name", ar: "اللقب" },
  massKg: { fr: "Masse (kg)", en: "Mass (kg)", ar: "الوزن (كغ)" },
  heightCm: { fr: "Taille (cm)", en: "Height (cm)", ar: "الطول (سم)" },
  positionRole: { fr: "Poste / rôle", en: "Position / role", ar: "المركز / الدور" },
  positionPlaceholder: { fr: "Sprinter, Ailier…", en: "Sprinter, Winger…", ar: "عدّاء، جناح…" },
  add: { fr: "Ajouter", en: "Add", ar: "إضافة" },
  fillNameAndMass: { fr: "Remplissez le nom et une masse valide.", en: "Please fill name and a valid mass.", ar: "يرجى إدخال الاسم ووزن صالح." },

  // ---- Player detail ----
  playerNotFound: { fr: "Joueur introuvable.", en: "Player not found.", ar: "اللاعب غير موجود." },
  testHistory: { fr: "Historique des tests", en: "Test history", ar: "سجل الاختبارات" },
  noTestsYet: { fr: "Aucun test encore. Lancez le premier sprint !", en: "No tests yet. Run the first sprint!", ar: "لا توجد اختبارات بعد. ابدأ أول عدو!" },
  test: { fr: "Test", en: "Test", ar: "اختبار" },
  testDeleted: { fr: "Test supprimé", en: "Test deleted", ar: "تم حذف الاختبار" },
  deleteTestConfirm: { fr: "Supprimer ce test ?", en: "Delete this test?", ar: "حذف هذا الاختبار؟" },
  deleteTest: { fr: "Supprimer le test", en: "Delete test", ar: "حذف الاختبار" },

  // ---- Jump test ----
  jumpTestTitle: { fr: "SAUT VERTICAL", en: "VERTICAL JUMP", ar: "\u00a0القفز العمودي" },
  jumpTestSubtitle: { fr: "Profil F-V à partir de squat jumps charges.", en: "\u00a0F-V profile from loaded squat jumps.", ar: "\u00a0منحنى القوة والسرعة من قفزات القرفصاء المحمّلة." },
  cameraCalib: { fr: "Étalonnage caméra", en: "Camera calibration", ar: "معايرة الكاميرا" },
  cameraCalibOptional: { fr: "Optionnel — utile uniquement si vous mesurez la hauteur au moyen de la caméra.", en: "Optional — needed only if you measure jump height with the camera.", ar: "اختياري — مطلوب فقط إذا كنت تقيس ارتفاع القفز بالكاميرا." },
  recalibrate: { fr: "Recalibrer", en: "Recalibrate", ar: "إعادة المعايرة" },
  startCalibration: { fr: "Démarrer l'étalonnage", en: "Start calibration", ar: "ابدأ المعايرة" },
  athleteParams: { fr: "Athlète & paramètres", en: "Athlete & parameters", ar: "الرياضي والمعطيات" },
  team: { fr: "Équipe", en: "Team", ar: "الفريق" },
  selectTeam: { fr: "Sélectionner une équipe", en: "Select a team", ar: "اختر فريقاً" },
  athlete: { fr: "Athlète", en: "Athlete", ar: "الرياضي" },
  selectEllipsis: { fr: "Sélectionner…", en: "Select…", ar: "اختر…" },
  bodyMass: { fr: "Masse\u00a0 (kg)", en: "Body mass (kg)", ar: "وزن الجسم (كغ)" },
  hpo: { fr: "hPO (m)", en: "hPO (m)", ar: "hPO (م)" },
  hpoHint: { fr: "hPO ≈ longueur de jambe × 0,4 (extension des membres inférieurs).", en: "hPO ≈ leg length × 0.4 (lower-limb extension distance).", ar: "hPO ≈ طول الساق × 0.4 (مسافة تمدد الأطراف السفلية)." },
  trials: { fr: "Essais", en: "Trials", ar: "المحاولات" },
  loadKg: { fr: "\u00a0 \u00a0Charge", en: "\u00a0 \u00a0Load", ar: "\u00a0 \u00a0الحمولة" },
  jumpHeightCm: { fr: "Hauteur de saut\u00a0", en: "Jump height\u00a0", ar: "ارتفاع القفز\u00a0" },
  measureHpo: { fr: "Mesurer hPO — extension", en: "Measure hPO — extension", ar: "قياس hPO — التمدد" },
  aiAutoDetect: { fr: "Détection auto IA", en: "AI auto-detect", ar: "كشف تلقائي بالذكاء الاصطناعي" },
  aiHint: { fr: "✨ L'IA détecte automatiquement décollage & atterrissage depuis la vidéo. 📷 le marqueur manuel utilise l'étalonnage px/cm.", en: "✨ AI auto-detects takeoff & landing from video. 📷 manual marker uses px/cm calibration.", ar: "✨ الذكاء الاصطناعي يكتشف الإقلاع والهبوط من الفيديو. 📷 العلامة اليدوية تستخدم معايرة px/cm." },
  selectAthleteFirst: { fr: "Sélectionnez un athlète d'abord.", en: "Select an athlete first.", ar: "اختر رياضياً أولاً." },
  needJumps: { fr: "Fournissez au moins 2 sauts valides + masse + hPO.", en: "Provide at least 2 valid jumps + body mass + hPO.", ar: "قدّم على الأقل قفزتين صالحتين + الوزن + hPO." },
  computing: { fr: "Calcul…", en: "Computing…", ar: "جارٍ الحساب…" },
  computeProfile: { fr: "Calculer le profil", en: "Compute profile", ar: "احسب الملف" },
  jumpDetected: { fr: "Saut détecté", en: "Jump detected", ar: "تم كشف القفزة" },
  delete: { fr: "Supprimer", en: "Delete", ar: "حذف" },

  // ---- Sprint test ----
  sprintTestTitle: { fr: "SPRINT\u00a0LINEAIRE\u00a0\u00a0", en: "LINEAR\u00a0SPRINT\u00a0", ar: "\u00a0العدو الخطي" },
  sprintTestSubtitle: { fr: "Profil F-V horizontal\u00a0", en: "Profil F-V horizontal\u00a0", ar: "منحنى القوة والسرعة\u00a0الأفقي" },
  demo: { fr: "Démo", en: "Demo", ar: "تجريبي" },
  loadDemoTitle: { fr: "Charger les données de démonstration", en: "Load demo data", ar: "تحميل البيانات التجريبية" },
  step1Athlete: { fr: "Athlète", en: "1. Athlete", ar: "1. الرياضي" },
  step2Protocol: { fr: "Protocole", en: "2. Protocol", ar: "2. البروتوكول" },
  step3Conditions: { fr: "Conditions", en: "3. Conditions", ar: "3. الظروف" },
  step4Splits: { fr: "Splits", en: "4. Splits", ar: "4. الأزمنة الجزئية" },
  step5Notes: { fr: "Notes", en: "5. Notes", ar: "5. ملاحظات" },
  heightM: { fr: "Taille (m)", en: "Height (m)", ar: "الطول (م)" },
  testDistance: { fr: "Distance du test", en: "Test distance", ar: "مسافة الاختبار" },
  startType: { fr: "Type de départ", en: "Start type", ar: "نوع الانطلاق" },
  standing: { fr: "Debout", en: "Standing", ar: "واقف" },
  threePoint: { fr: "3 appuis", en: "3-point", ar: "3 نقاط" },
  blocks: { fr: "Starting-blocks", en: "Starting blocks", ar: "منصات الانطلاق" },
  surface: { fr: "Surface", en: "Surface", ar: "الأرضية" },
  track: { fr: "Piste", en: "Track", ar: "مضمار" },
  grass: { fr: "Gazon", en: "Grass", ar: "عشب" },
  synthetic: { fr: "Synthétique", en: "Synthetic", ar: "اصطناعي" },
  indoor: { fr: "Indoor", en: "Indoor", ar: "قاعة مغلقة" },
  shoeType: { fr: "Type de chaussures", en: "Shoe type", ar: "نوع الحذاء" },
  shoeSpikes: { fr: "Pointes (sprint)", en: "Sprint spikes", ar: "أشواك العدو" },
  shoeCleats: { fr: "Crampons (foot / rugby)", en: "Cleats (football / rugby)", ar: "أحذية بمسامير (كرة قدم/ركبي)" },
  shoeSprint: { fr: "Chaussures de sprint / training", en: "Sprint / training shoes", ar: "أحذية سبرينت / تدريب" },
  shoeCorrection: { fr: "Une correction est appliquée selon la combinaison chaussure × surface (réf. : pointes sur piste).", en: "A correction is applied per shoe × surface combination (ref: spikes on track).", ar: "يُطبَّق تصحيح حسب توليفة الحذاء × الأرضية (المرجع: مسامير على المضمار)." },
  temperature: { fr: "Temp (°C)", en: "Temp (°C)", ar: "الحرارة (°م)" },
  pressure: { fr: "Pression (hPa)", en: "Pressure (hPa)", ar: "الضغط (hPa)" },
  windMs: { fr: "Vent (m/s)", en: "Wind (m/s)", ar: "الرياح (م/ث)" },
  windDirection: { fr: "Direction du vent", en: "Wind direction", ar: "اتجاه الرياح" },
  tailwind: { fr: "Propulsion", en: "Tailwind", ar: "دافعة" },
  neutral: { fr: "Neutre", en: "Neutral", ar: "محايدة" },
  headwind: { fr: "Résistance", en: "Headwind", ar: "معاكسة" },
  windHint: { fr: "Propulsion = vent qui pousse l'athlète · Résistance = vent qui freine · Neutre = aucun effet.", en: "Tailwind = wind pushes the athlete · Headwind = wind slows down · Neutral = no effect.", ar: "دافعة = رياح تدفع الرياضي · معاكسة = رياح تعيقه · محايدة = لا تأثير." },
  locate: { fr: "Localiser", en: "Locate", ar: "تحديد الموقع" },
  refresh: { fr: "Actualiser", en: "Refresh", ar: "تحديث" },
  weatherImported: { fr: "Conditions météo importées", en: "Weather imported", ar: "تم استيراد الأحوال الجوية" },
  weatherError: { fr: "Impossible de récupérer la météo.", en: "Unable to fetch weather.", ar: "تعذر جلب حالة الطقس." },
  allowLocation: { fr: "Autorisez la localisation dans votre navigateur.", en: "Allow location access in your browser.", ar: "اسمح بالوصول إلى الموقع في متصفحك." },
  timeoutRetry: { fr: "Délai dépassé — réessayez.", en: "Timeout — try again.", ar: "انتهت المهلة — أعد المحاولة." },
  distanceM: { fr: "Distance (m)", en: "Distance (m)", ar: "المسافة (م)" },
  timeS: { fr: "Temps (s)", en: "Time (s)", ar: "الزمن (ث)" },
  source: { fr: "Source", en: "Source", ar: "المصدر" },
  video: { fr: "vidéo", en: "video", ar: "فيديو" },
  ai: { fr: "IA", en: "AI", ar: "ذ. إ." },
  manual: { fr: "manuel", en: "manual", ar: "يدوي" },
  splitsHint: { fr: "Astuce : utilisez la caméra ou l'analyse vidéo IA pour extraire les temps depuis une vidéo de course.", en: "Tip: use the camera or AI video analysis to extract times from a run video.", ar: "نصيحة: استخدم الكاميرا أو تحليل الفيديو بالذكاء الاصطناعي لاستخراج الأزمنة من الفيديو." },
  notesPlaceholder: { fr: "Observations, ressentis, contexte de la séance…", en: "Observations, feelings, session context…", ar: "ملاحظات، انطباعات، سياق الجلسة…" },
  selectAthlete: { fr: "Sélectionnez un athlète.", en: "Select an athlete.", ar: "اختر رياضياً." },
  needSplits: { fr: "Fournir au moins 3 splits + masse + taille.", en: "Provide at least 3 splits + mass + height.", ar: "قدّم 3 أزمنة على الأقل + الوزن + الطول." },
  computeSprint: { fr: "Calculer le profil", en: "Compute profile", ar: "احسب الملف" },
  camera: { fr: "Caméra", en: "Camera", ar: "الكاميرا" },
  videoAi: { fr: "Analyse vidéo IA", en: "AI video analysis", ar: "تحليل فيديو بالذكاء الاصطناعي" },

  // ---- Test results ----
  backToTest: { fr: "Retour au test", en: "Back to test", ar: "العودة إلى الاختبار" },
  save: { fr: "Enregistrer", en: "Save", ar: "حفظ" },
  saved: { fr: "Enregistré", en: "Saved", ar: "محفوظ" },
  export: { fr: "Exporter", en: "Export", ar: "تصدير" },
  exporting: { fr: "Export…", en: "Exporting…", ar: "جارٍ التصدير…" },
  loadingEllipsis: { fr: "Chargement…", en: "Loading…", ar: "جارٍ التحميل…" },
  testNotFound: { fr: "Test introuvable.", en: "Test not found.", ar: "الاختبار غير موجود." },
  alreadySaved: { fr: "Déjà enregistré", en: "Already saved", ar: "محفوظ مسبقاً" },
  addedToHistory: { fr: "Ajouté à l'historique", en: "Added to history", ar: "أُضيف إلى السجل" },
  fvJumpLabel: { fr: "Profil F-V — Saut vertical", en: "F-V profile — Vertical jump", ar: "ملف F-V — القفز العمودي" },
  fvSprintLabel: { fr: "Profil F-V — Sprint linéaire", en: "F-V profile — Linear sprint", ar: "ملف F-V — العدو الخطي" },
  protocolConditions: { fr: "Protocole & conditions", en: "Protocol & conditions", ar: "البروتوكول والظروف" },
  distance: { fr: "Distance", en: "Distance", ar: "المسافة" },
  start: { fr: "Départ", en: "Start", ar: "الانطلاق" },
  wind: { fr: "Vent", en: "Wind", ar: "الرياح" },
  temp: { fr: "Température", en: "Temperature", ar: "الحرارة" },
  press: { fr: "Pression", en: "Pressure", ar: "الضغط" },
  shoes: { fr: "Chaussures", en: "Shoes", ar: "الأحذية" },
  videoFps: { fr: "FPS vidéo", en: "Video FPS", ar: "إطارات/ثانية" },
  qualityScore: { fr: "Score de qualité", en: "Quality score", ar: "درجة الجودة" },
  modelFit: { fr: "Fit modèle (R²)", en: "Model fit (R²)", ar: "ملاءمة النموذج (R²)" },
  splitCoherence: { fr: "Cohérence splits", en: "Split coherence", ar: "تناسق الأزمنة" },
  distanceTime: { fr: "Distance — temps", en: "Distance — time", ar: "المسافة — الزمن" },
  velocityTimePhases: { fr: "Vitesse — temps (phases)", en: "Velocity — time (phases)", ar: "السرعة — الزمن (المراحل)" },
  accelTime: { fr: "Accélération — temps", en: "Acceleration — time", ar: "التسارع — الزمن" },
  fvRelation: { fr: "Relation Force horizontale-Vitesse", en: "Horizontal Force-Velocity relation", ar: "العلاقة بين القوة الأفقية والسرعة" },
  powerVelocity: { fr: "Puissance — vitesse", en: "Power — velocity", ar: "الاستطاعة — السرعة" },
  rfVelocity: { fr: "RF — vitesse", en: "RF — velocity", ar: "RF — السرعة" },
  splits: { fr: "Splits", en: "Splits", ar: "الأزمنة الجزئية" },
  measured: { fr: "Mesuré", en: "Measured", ar: "مقاس" },
  model: { fr: "Modèle", en: "Model", ar: "النموذج" },
  interpretation: { fr: "Interprétation", en: "Interpretation", ar: "التفسير" },
  practitionerNotes: { fr: "Notes du praticien", en: "Practitioner notes", ar: "ملاحظات الممارس" },
  methodRefs: { fr: "Méthode et références", en: "Method and references", ar: "المنهجية والمراجع" },
  fvProfileSamozino: { fr: "Profil F-V (Samozino)", en: "F-V profile (Samozino)", ar: "ملف F-V (سامودزينو)" },
  fvGraph: { fr: "Représentation graphique F-V", en: "Force-Velocity graph", ar: "المخطط البياني F-V" },
  hMaxTheo: { fr: "hMax théo.", en: "hMax theo.", ar: "hMax نظري" },
  medicalDisclaimer: { fr: "Ces résultats ne constituent pas un diagnostic médical. Ils doivent être interprétés par un professionnel qualifié en tenant compte du contexte sportif, médical et de l'historique de l'athlète.", en: "These results are not a medical diagnosis. They should be interpreted by a qualified professional considering sport context, medical history and the athlete's background.", ar: "هذه النتائج ليست تشخيصاً طبياً. يجب تفسيرها من قبل مختص مؤهل مع مراعاة السياق الرياضي والطبي وخلفية الرياضي." },
} as const;

export type TKey = keyof typeof TR;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
    const html = document.documentElement;
    if (s.theme === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
    html.lang = s.lang;
    html.dir = s.lang === "ar" ? "rtl" : "ltr";

    const H = Number(s.accent) || 0;
    const H2 = (H + 55) % 360;
    const H3 = (H + 25) % 360;
    const isDark = s.theme === "dark";
    const primaryL = isDark ? 55 : 42;
    const primaryS = isDark ? 90 : 70;
    const primary = `${H} ${primaryS}% ${primaryL}%`;
    const primaryGlow = `${H} 100% 65%`;
    const accent = `${H2} 90% 58%`;
    const success = `${H} 70% 48%`;
    const primaryFg = isDark ? "222 30% 8%" : "0 0% 100%";

    html.style.setProperty("--primary", primary);
    html.style.setProperty("--primary-foreground", primaryFg);
    html.style.setProperty("--primary-glow", primaryGlow);
    html.style.setProperty("--ring", primary);
    html.style.setProperty("--accent", accent);
    html.style.setProperty("--accent-foreground", primaryFg);
    html.style.setProperty("--velocity", accent);
    html.style.setProperty("--phase-accel", primary);
    html.style.setProperty("--phase-max", accent);
    html.style.setProperty("--success", success);
    html.style.setProperty("--sidebar-primary", primary);
    html.style.setProperty("--sidebar-primary-foreground", primaryFg);
    html.style.setProperty("--sidebar-ring", primary);

    html.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${H} ${primaryS}% ${primaryL}%) 0%, hsl(${H3} 80% 50%) 100%)`
    );
    html.style.setProperty(
      "--gradient-accent",
      `linear-gradient(135deg, hsl(${H2} 90% 58%) 0%, hsl(${(H2 + 24) % 360} 90% 60%) 100%)`
    );
    const heroA = isDark ? 0.18 : 0.10;
    const heroB = isDark ? 0.12 : 0.07;
    html.style.setProperty(
      "--gradient-hero",
      `radial-gradient(ellipse at top, hsl(${H} ${primaryS}% ${primaryL}% / ${heroA}), transparent 60%), radial-gradient(ellipse at bottom right, hsl(${H2} 90% 58% / ${heroB}), transparent 60%)`
    );
    html.style.setProperty("--shadow-glow", `0 0 40px hsl(${H} ${primaryS}% ${primaryL}% / 0.35)`);

    const logoHueShift = ((H - 120) + 360) % 360;
    html.style.setProperty("--logo-hue-shift", `${logoHueShift}deg`);
    html.style.setProperty("--logo-brightness", isDark ? "1" : "0.92");
  }, [s]);

  const t = useCallback<Ctx["t"]>((k) => (TR[k]?.[s.lang] ?? (k as string)), [s.lang]);

  const value: Ctx = {
    ...s,
    setLang: (lang) => setS((p) => ({ ...p, lang })),
    setTheme: (theme) => setS((p) => ({ ...p, theme })),
    setAccent: (accent) => setS((p) => ({ ...p, accent })),
    t,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
