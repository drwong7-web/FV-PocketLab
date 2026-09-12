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
  cloudBackupDesc: {
    fr: "Liez une fois votre cloud, puis synchronisez quand vous voulez. Les données restent aussi sur l’appareil.",
    en: "Link your cloud once, then sync whenever you want. Data also stays on this device.",
    ar: "اربط سحابتك مرة واحدة، ثم زامِن متى شئت. تبقى البيانات أيضاً على الجهاز.",
  },
  connectGDrive: {
    fr: "Connecter Google Drive",
    en: "Connect Google Drive",
    ar: "ربط Google Drive",
  },
  connectICloud: {
    fr: "Connecter iCloud Drive",
    en: "Connect iCloud Drive",
    ar: "ربط iCloud Drive",
  },
  syncConnected: {
    fr: "Cloud connecté. Vous pouvez synchroniser quand vous voulez.",
    en: "Cloud connected. You can sync anytime.",
    ar: "تم ربط السحابة. يمكنك المزامنة في أي وقت.",
  },
  syncConnectedFile: {
    fr: "Mode fichier .slfv activé.",
    en: ".slfv file mode enabled.",
    ar: "تم تفعيل وضع ملف .slfv.",
  },

  // Sauvegarde sur le compte (Supabase Storage)
  accountSyncLabel: { fr: "Mon compte", en: "My account", ar: "حسابي" },
  connectAccountSync: { fr: "Sauvegarder sur mon compte", en: "Back up to my account", ar: "النسخ الاحتياطي إلى حسابي" },
  accountSyncDesc: {
    fr: "Vos données sont enregistrées dans un fichier privé lié à votre compte. Reconnectez-vous sur un autre appareil pour les retrouver.",
    en: "Your data is stored in a private file tied to your account. Sign in on another device to get it back.",
    ar: "تُحفظ بياناتك في ملف خاص مرتبط بحسابك. سجّل الدخول على جهاز آخر لاستعادتها.",
  },
  accountSyncProOnly: {
    fr: "La sauvegarde sur le compte est incluse dans les formules Pro et Achat unique. En gratuit, exportez un fichier .slfv.",
    en: "Account backup is included with the Pro and Lifetime plans. On the free plan, export a .slfv file instead.",
    ar: "النسخ الاحتياطي على الحساب متاح في خطتي «برو» و«الشراء لمرة واحدة». في الخطة المجانية، صدّر ملف .slfv.",
  },
  accountSyncHint: {
    fr: "Un seul fichier par compte, écrasé à chaque envoi. La récupération est automatique sur un appareil vide.",
    en: "One file per account, overwritten on every push. Restore happens automatically on an empty device.",
    ar: "ملف واحد لكل حساب، يُستبدل عند كل إرسال. الاستعادة تلقائية على جهاز فارغ.",
  },
  syncConnectedAccount: {
    fr: "Sauvegarde sur le compte activée.",
    en: "Account backup enabled.",
    ar: "تم تفعيل النسخ الاحتياطي على الحساب.",
  },
  syncProRequired: {
    fr: "Votre formule ne permet plus l'envoi. Vos données restent téléchargeables.",
    en: "Your plan no longer allows uploads. Your data can still be downloaded.",
    ar: "خطتك لم تعد تسمح بالرفع. لا يزال بإمكانك تنزيل بياناتك.",
  },
  autoRestoreDone: {
    fr: "Données restaurées depuis votre compte",
    en: "Data restored from your account",
    ar: "تمت استعادة البيانات من حسابك",
  },
  syncConnectedStatus: { fr: "Connecté", en: "Connected", ar: "متصل" },
  syncDisconnected: {
    fr: "Cloud déconnecté.",
    en: "Cloud disconnected.",
    ar: "تم قطع اتصال السحابة.",
  },
  disconnectCloud: { fr: "Déconnecter", en: "Disconnect", ar: "قطع الاتصال" },
  backupICloud: { fr: "Sauvegarder sur iCloud Drive", en: "Back up to iCloud Drive", ar: "احفظ على iCloud Drive" },
  backupGDrive: { fr: "Sauvegarder sur Google Drive", en: "Back up to Google Drive", ar: "احفظ على Google Drive" },
  gdriveUnavailable: {
    fr: "Google Drive indisponible (ajoutez VITE_SLFV_GDRIVE_CLIENT_ID). Utilisez le fichier .slfv.",
    en: "Google Drive unavailable (set VITE_SLFV_GDRIVE_CLIENT_ID). Use the .slfv file.",
    ar: "‏Google Drive غير متاح (عيّن VITE_SLFV_GDRIVE_CLIENT_ID). استخدم ملف .slfv.",
  },
  useSlfvFile: { fr: "Utiliser un fichier .slfv à la place", en: "Use a .slfv file instead", ar: "استخدم ملف .slfv بدلاً من ذلك" },
  fileSyncHint: {
    fr: "Envoyer télécharge un .slfv ; Récupérer ouvre le sélecteur de fichiers.",
    en: "Push downloads a .slfv file; Pull opens the file picker.",
    ar: "الإرسال ينزّل ملف .slfv؛ والاسترجاع يفتح منتقي الملفات.",
  },
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
  all: { fr: "Tous", en: "All", ar: "الكل" },
  acrossOrg: { fr: "Sur toute votre organisation.", en: "Across your organisation.", ar: "عبر المنظمة بأكملها." },
  new: { fr: "Nouveau", en: "New", ar: "جديد" },
  noTests: { fr: "Aucun test enregistré pour le moment.", en: "No tests recorded yet.", ar: "لا توجد اختبارات مسجلة بعد." },
  launchTest: { fr: "Lancer un test", en: "Launch a test", ar: "بدء اختبار" },
  chooseTestType: { fr: "Choisissez le type de test pour commencer.", en: "Choose the test type to get started.", ar: "اختر نوع الاختبار للبدء." },
  dashboard: { fr: "Tableau de bord", en: "Dashboard", ar: "الرئيسية" },

  // ---- Auth ----
  localFirst: { fr: "FORCE VELOCITY PROFILER\n\u00a0 \u00a0 \u00a0 \u00a0IN YOUR POCKET\u00a0", en: "FORCE VELOCITY PROFILER\n\u00a0 \u00a0 \u00a0 \u00a0IN YOUR POCKET\u00a0", ar: "FORCE VELOCITY PROFILER\n\u00a0 \u00a0 \u00a0 \u00a0IN YOUR POCKET\u00a0" },
  createProfile: { fr: "\n", en: "Create your profile", ar: "أنشئ ملفك الشخصي" },
  yourName: { fr: "Username", en: "Username", ar: "اسم المستخدم" },
  createMyProfile: { fr: "Créer mon profil", en: "Create my profile", ar: "أنشئ ملفي" },
  nameTeamRequired: { fr: "Nom et mot de passe requis.", en: "Name and password required.", ar: "الاسم وكلمة المرور مطلوبان." },
  profileCreated: { fr: "Profil créé.", en: "Profile created.", ar: "تم إنشاء الملف." },
  storageNote: { fr: "\n", en: "\n", ar: "\n" },
  login: { fr: "Connexion", en: "Login", ar: "تسجيل الدخول" },
  signUp: { fr: "Créer un profil", en: "Sign up", ar: "إنشاء حساب" },
  password: { fr: "Mot de passe", en: "Password", ar: "كلمة المرور" },
  confirmPassword: { fr: "Confirmer le mot de passe", en: "Confirm password", ar: "تأكيد كلمة المرور" },
  passwordsDontMatch: { fr: "Les mots de passe ne correspondent pas.", en: "Passwords do not match.", ar: "كلمتا المرور غير متطابقتين." },
  passwordTooShort: { fr: "Mot de passe trop court (min. 6).", en: "Password too short (min 6).", ar: "كلمة المرور قصيرة جداً (6 على الأقل)." },
  invalidCredentials: { fr: "Nom ou mot de passe incorrect.", en: "Invalid name or password.", ar: "الاسم أو كلمة المرور غير صحيحة." },
  nameAlreadyExists: { fr: "Ce nom est déjà utilisé.", en: "This name is already used.", ar: "هذا الاسم مستخدم بالفعل." },
  switchToLogin: { fr: "Déjà un profil ? Se connecter", en: "Already have a profile? Log in", ar: "لديك ملف؟ سجّل الدخول" },
  switchToSignup: { fr: "Pas de profil ? Créer un profil", en: "No profile?\u00a0 Sign up", ar: "لا يوجد ملف؟ أنشئ حساباً" },
  alreadyHaveProfile: { fr: "Déjà un profil ?", en: "Already have a profile?", ar: "لديك ملف؟" },
  noProfilePrompt: { fr: "Pas de profil ?", en: "No profile?", ar: "لا يوجد ملف؟" },
  logInLink: { fr: "Se connecter", en: "Log in", ar: "سجّل الدخول" },
  signUpLink: { fr: "Créer un profil", en: "Sign up", ar: "أنشئ حساباً" },
  loginBtn: { fr: "Se connecter", en: "Log in", ar: "تسجيل الدخول" },
  welcomeBack: { fr: "Bon retour", en: "Welcome back", ar: "مرحباً بعودتك" },
  forgotPassword: {
    fr: "Mot de passe oublié ?",
    en: "Forgot password?",
    ar: "نسيت كلمة المرور؟",
  },
  forgotPasswordTitle: {
    fr: "Réinitialiser le mot de passe",
    en: "Reset password",
    ar: "إعادة تعيين كلمة المرور",
  },
  forgotPasswordHint: {
    fr: "À la validation, le verrouillage de cet appareil s’ouvre (biométrie ou code). Aucune configuration préalable. Puis le nouveau mot de passe est enregistré.",
    en: "On submit, this device’s lock opens (biometrics or lock code)—no setup needed. Then your new password is saved.",
    ar: "عند الإرسال يُفتح قفل هذا الجهاز (بصمة أو رمز) دون إعداد مسبق. ثم تُحفظ كلمة المرور الجديدة.",
  },
  newPassword: { fr: "Nouveau mot de passe", en: "New password", ar: "كلمة مرور جديدة" },
  unlockAndResetPassword: {
    fr: "Déverrouiller et réinitialiser",
    en: "Unlock and reset password",
    ar: "فتح القفل وإعادة التعيين",
  },
  passwordResetOk: {
    fr: "Mot de passe mis à jour.",
    en: "Password updated.",
    ar: "تم تحديث كلمة المرور.",
  },
  backToLogin: { fr: "Retour à la connexion", en: "Back to login", ar: "العودة لتسجيل الدخول" },

  // ---- Supabase auth ----
  authEmail: { fr: "Adresse e-mail", en: "Email address", ar: "البريد الإلكتروني" },
  emailExists: { fr: "Un compte existe déjà avec cette adresse.", en: "An account already exists with this email.", ar: "يوجد حساب بهذا البريد الإلكتروني مسبقاً." },
  emailNotConfirmed: { fr: "Confirmez votre adresse e-mail avant de vous connecter.", en: "Confirm your email address before signing in.", ar: "أكّد بريدك الإلكتروني قبل تسجيل الدخول." },
  confirmEmailSent: { fr: "Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.", en: "Check your inbox to confirm your address, then sign in.", ar: "تحقّق من بريدك لتأكيد عنوانك، ثم سجّل الدخول." },
  emailRequired: { fr: "Adresse e-mail et mot de passe requis.", en: "Email and password are required.", ar: "البريد الإلكتروني وكلمة المرور مطلوبان." },
  sendResetLink: { fr: "Envoyer le lien de réinitialisation", en: "Send reset link", ar: "أرسل رابط إعادة التعيين" },
  resetEmailSent: { fr: "Lien envoyé. Consultez votre boîte mail.", en: "Link sent. Check your inbox.", ar: "تم إرسال الرابط. تحقّق من بريدك." },
  resetEmailHint: {
    fr: "Saisissez votre adresse : nous vous envoyons un lien pour choisir un nouveau mot de passe.",
    en: "Enter your address and we'll email you a link to choose a new password.",
    ar: "أدخل عنوانك وسنرسل إليك رابطاً لاختيار كلمة مرور جديدة.",
  },
  chooseNewPassword: { fr: "Choisir un nouveau mot de passe", en: "Choose a new password", ar: "اختر كلمة مرور جديدة" },
  updatePasswordCta: { fr: "Mettre à jour le mot de passe", en: "Update password", ar: "تحديث كلمة المرور" },
  resetLinkInvalid: { fr: "Ce lien est invalide ou expiré. Demandez-en un nouveau.", en: "This link is invalid or has expired. Request a new one.", ar: "هذا الرابط غير صالح أو منتهي. اطلب رابطاً جديداً." },
  offlineBadge: { fr: "Hors ligne", en: "Offline", ar: "دون اتصال" },
  offlineSignedIn: {
    fr: "Connecté hors ligne. Votre abonnement sera revérifié à la prochaine connexion.",
    en: "Signed in offline. Your plan will be re-checked next time you're online.",
    ar: "تم تسجيل الدخول دون اتصال. سيُعاد التحقق من خطتك عند الاتصال.",
  },
  offlineSignupBlocked: {
    fr: "La création de compte nécessite une connexion. Une fois inscrit, vous pourrez vous connecter hors ligne.",
    en: "Creating an account needs a connection. Once signed up, you can sign in offline.",
    ar: "إنشاء الحساب يتطلب اتصالاً. بعد التسجيل يمكنك تسجيل الدخول دون اتصال.",
  },
  offlineNoCredential: {
    fr: "Aucun profil hors ligne pour cette adresse sur cet appareil. Connectez-vous une fois en ligne.",
    en: "No offline profile for this email on this device. Sign in once while online.",
    ar: "لا يوجد ملف دون اتصال لهذا البريد على هذا الجهاز. سجّل الدخول مرة واحدة عبر الإنترنت.",
  },
  offlineResetBlocked: { fr: "La réinitialisation nécessite une connexion.", en: "Resetting a password needs a connection.", ar: "إعادة تعيين كلمة المرور تتطلب اتصالاً." },
  networkError: { fr: "Réseau indisponible. Réessayez.", en: "Network unavailable. Try again.", ar: "الشبكة غير متاحة. أعد المحاولة." },
  notConfiguredError: { fr: "Supabase n'est pas configuré (fichier .env).", en: "Supabase is not configured (.env file).", ar: "لم يتم تكوين Supabase (ملف .env)." },
  genericAuthError: { fr: "Connexion impossible. Réessayez.", en: "Could not sign in. Try again.", ar: "تعذّر تسجيل الدخول. أعد المحاولة." },

  // ---- Account & plan ----
  account: { fr: "Compte", en: "Account", ar: "الحساب" },
  signedInAs: { fr: "Connecté en tant que", en: "Signed in as", ar: "مسجّل الدخول كـ" },
  planLabel: { fr: "Formule", en: "Plan", ar: "الخطة" },
  planFree: { fr: "Gratuit", en: "Free", ar: "مجاني" },
  planProMonthly: { fr: "Pro mensuel", en: "Pro monthly", ar: "برو شهري" },
  planProYearly: { fr: "Pro annuel", en: "Pro yearly", ar: "برو سنوي" },
  planLifetime: { fr: "Achat unique", en: "Lifetime", ar: "شراء لمرة واحدة" },
  planStatusActive: { fr: "Actif", en: "Active", ar: "نشط" },
  planStatusTrialing: { fr: "Essai", en: "Trial", ar: "تجريبي" },
  planStatusPastDue: { fr: "Paiement en retard", en: "Past due", ar: "دفعة متأخرة" },
  planStatusCanceled: { fr: "Annulé", en: "Canceled", ar: "ملغى" },
  planStatusExpired: { fr: "Expiré", en: "Expired", ar: "منتهي" },
  planRenewsOn: { fr: "Renouvellement le", en: "Renews on", ar: "يتجدد في" },
  planFullAccessNote: { fr: "Accès complet, sans publicité.", en: "Full access, no ads.", ar: "وصول كامل بدون إعلانات." },
  planLimitedNote: { fr: "Fonctionnalités limitées, avec publicités.", en: "Limited features, with ads.", ar: "مزايا محدودة مع إعلانات." },
  freeLimitTeam: {
    fr: "Le plan gratuit autorise 1 équipe. Passez à Pro pour en ajouter.",
    en: "Free plan allows 1 team. Upgrade for more.",
    ar: "الخطة المجانية تسمح بفريق واحد. رقِّ لإضافة المزيد.",
  },
  freeLimitAthletes: {
    fr: "Le plan gratuit autorise 3 athlètes par équipe. Passez à Pro pour en ajouter.",
    en: "Free plan allows 3 athletes per team. Upgrade for more.",
    ar: "الخطة المجانية تسمح بـ 3 رياضيين لكل فريق. رقِّ لإضافة المزيد.",
  },
  freeLimitTests: {
    fr: "Le plan gratuit autorise 3 tests par athlète ce mois-ci. Passez à Pro pour en ajouter.",
    en: "Free plan allows 3 tests per athlete this month. Upgrade for more.",
    ar: "الخطة المجانية تسمح بـ 3 اختبارات لكل رياضي هذا الشهر. رقِّ لإضافة المزيد.",
  },
  freeLimitExport: {
    fr: "Le plan gratuit n'inclut pas les rapports PDF et Word. Passez à Pro pour exporter.",
    en: "Free plan does not include PDF and Word reports. Upgrade to export.",
    ar: "الخطة المجانية لا تشمل تقارير PDF وWord. رقِّ للتصدير.",
  },
  freeLimitImport: {
    fr: "Le plan gratuit n'inclut pas l'import de listes d'athlètes (PDF, Word ou image). Passez à Pro pour importer.",
    en: "Free plan does not include athlete list import from PDF, Word, or images. Upgrade to import.",
    ar: "الخطة المجانية لا تشمل استيراد قوائم الرياضيين من PDF أو Word أو الصور. رقِّ للاستيراد.",
  },
  planRefresh: { fr: "Actualiser", en: "Refresh", ar: "تحديث" },
  planOfflineNote: { fr: "Formule affichée d'après la dernière vérification en ligne.", en: "Plan shown from the last online check.", ar: "الخطة معروضة حسب آخر تحقق عبر الإنترنت." },
  planPaymentsNote: { fr: "Paiement sécurisé via Creem.", en: "Secure checkout via Creem.", ar: "دفع آمن عبر Creem." },
  planBuyPro: { fr: "Passer en Pro mensuel", en: "Upgrade to Pro monthly", ar: "الترقية إلى برو شهري" },
  planBuyYearly: { fr: "Passer en Pro annuel", en: "Upgrade to Pro yearly", ar: "الترقية إلى برو سنوي" },
  planBuyLifetime: { fr: "Acheter à vie", en: "Buy lifetime", ar: "شراء مدى الحياة" },
  planManageBilling: { fr: "Gérer l'abonnement", en: "Manage billing", ar: "إدارة الفوترة" },
  planCheckoutSuccess: { fr: "Paiement reçu. La formule se met à jour dans un instant.", en: "Payment received. Your plan will update in a moment.", ar: "تم استلام الدفع. ستُحدَّث خطتك خلال لحظات." },
  planCheckoutError: { fr: "Impossible d'ouvrir le paiement.", en: "Could not start checkout.", ar: "تعذّر بدء الدفع." },
  planPortalError: { fr: "Impossible d'ouvrir le portail de facturation.", en: "Could not open the billing portal.", ar: "تعذّر فتح بوابة الفوترة." },
  deviceUnlockTitle: {
    fr: "Sécuriser la réinitialisation",
    en: "Protect password reset",
    ar: "حماية إعادة تعيين كلمة المرور",
  },
  deviceUnlockEnrollHint: {
    fr: "Obligatoire pour réinitialiser un mot de passe oublié. Utilise Face ID, empreinte, Windows Hello ou le code de verrouillage de cet appareil.",
    en: "Required to reset a forgotten password. Uses Face ID, fingerprint, Windows Hello, or this device’s lock code.",
    ar: "مطلوب لإعادة تعيين كلمة مرور منسية. يستخدم Face ID أو البصمة أو Windows Hello أو رمز قفل هذا الجهاز.",
  },
  deviceUnlockEnable: {
    fr: "Activer le déverrouillage appareil",
    en: "Enable device unlock",
    ar: "تفعيل فتح الجهاز",
  },
  deviceUnlockSkip: {
    fr: "Passer (pas de récupération de mot de passe)",
    en: "Skip (no password recovery)",
    ar: "تخطّي (بدون استعادة كلمة المرور)",
  },
  deviceUnlockEnrolled: {
    fr: "Déverrouillage appareil activé.",
    en: "Device unlock enabled.",
    ar: "تم تفعيل فتح الجهاز.",
  },
  deviceUnlockRemoved: {
    fr: "Déverrouillage appareil désactivé.",
    en: "Device unlock disabled.",
    ar: "تم تعطيل فتح الجهاز.",
  },
  deviceUnlockCancelled: {
    fr: "Déverrouillage annulé. Vous restez déconnecté.",
    en: "Unlock cancelled. You stay signed out.",
    ar: "تم إلغاء الفتح. تبقى غير مسجّل الدخول.",
  },
  deviceUnlockUnsupported: {
    fr: "Le déverrouillage appareil n'est pas disponible ici (HTTPS ou localhost requis, et un verrouillage système sur l’appareil).",
    en: "Device unlock isn’t available here (needs HTTPS or localhost, and a system lock on the device).",
    ar: "فتح الجهاز غير متاح هنا (يلزم HTTPS أو localhost وقفل نظام على الجهاز).",
  },
  deviceUnlockLanHttp: {
    fr: "Déverrouillage impossible en HTTP sur une IP locale. Sur ce PC : https://localhost:8080. Sur téléphone : https://VOTRE-IP:8080 (accepter l’avertissement certificat) — pas http://192.168.x.x.",
    en: "Device unlock can’t run over LAN HTTP. On this PC use https://localhost:8080. On a phone use https://YOUR-IP:8080 (accept the cert warning) — not http://192.168.x.x.",
    ar: "لا يعمل فتح الجهاز عبر HTTP على IP محلي. على هذا الجهاز: https://localhost:8080. وعلى الهاتف: https://YOUR-IP:8080 (اقبل تحذير الشهادة) — وليس http://192.168.x.x.",
  },
  deviceUnlockInsecure: {
    fr: "Contexte non sécurisé. Ouvrez l’app en HTTPS (ex. https://localhost:8080).",
    en: "Insecure context. Open the app over HTTPS (e.g. https://localhost:8080).",
    ar: "سياق غير آمن. افتح التطبيق عبر HTTPS (مثل https://localhost:8080).",
  },
  deviceUnlockNotEnrolled: {
    fr: "Ce profil n’a pas encore activé le déverrouillage. Connectez-vous avec le mot de passe actuel, activez-le (écran après connexion ou Réglages → Enabled), puis réessayez « Mot de passe oublié ».",
    en: "This profile hasn’t enabled device unlock yet. Sign in with your current password, enable unlock (prompt after login or Settings → Enabled), then try Forgot password again.",
    ar: "هذا الملف لم يفعّل فتح الجهاز بعد. سجّل الدخول بكلمة المرور الحالية، فعّل الفتح (بعد الدخول أو الإعدادات ← مفعّل)، ثم أعد محاولة نسيت كلمة المرور.",
  },
  deviceUnlockRateLimited: {
    fr: "Trop d'essais. Réessayez plus tard.",
    en: "Too many attempts. Try again later.",
    ar: "محاولات كثيرة. حاول لاحقاً.",
  },
  deviceUnlockFailed: {
    fr: "Échec du déverrouillage. Vous restez déconnecté.",
    en: "Unlock failed. You stay signed out.",
    ar: "فشل الفتح. تبقى غير مسجّل الدخول.",
  },
  deviceUnlockSettingsTitle: {
    fr: "Réinitialisation par appareil",
    en: "Device unlock reset",
    ar: "إعادة التعيين بفتح الجهاز",
  },
  deviceUnlockSettingsDesc: {
    fr: "Autorise la réinitialisation du mot de passe via biométrie ou code de verrouillage sur cet appareil.",
    en: "Allows password reset via biometrics or lock code on this device.",
    ar: "يسمح بإعادة تعيين كلمة المرور عبر البصمة أو رمز القفل على هذا الجهاز.",
  },
  deviceUnlockStatusOn: { fr: "Activé", en: "Enabled", ar: "مفعّل" },
  deviceUnlockStatusOff: { fr: "Non configuré", en: "Not set up", ar: "غير معدّ" },
  deviceUnlockRemove: {
    fr: "Désactiver",
    en: "Disable",
    ar: "تعطيل",
  },

  // ---- Teams page ----
  teamsSubtitle: { fr: "Regroupez les athlètes par équipe.", en: "Group your athletes by team.", ar: "جمّع الرياضيين حسب الفريق." },
  createTeamTitle: { fr: "Créer une équipe", en: "Create team", ar: "إنشاء فريق" },
  teamName: { fr: "Nom de l'équipe", en: "Team name", ar: "اسم الفريق" },
  sport: { fr: "Sport", en: "Sport", ar: "الرياضة" },
  sportPlaceholder: { fr: "Sélectionner un sport…", en: "Select a sport…", ar: "اختر رياضة…" },
  // Sport groups
  sportGroupTeam: { fr: "Sports collectifs", en: "Team sports", ar: "الرياضات الجماعية" },
  sportGroupAthletics: { fr: "Athlétisme", en: "Athletics", ar: "ألعاب القوى" },
  sportGroupOther: { fr: "Autres sports", en: "Other sports", ar: "رياضات أخرى" },
  sportGroupFallback: { fr: "Non listé", en: "Not listed", ar: "غير مدرج" },
  // Sport options
  sportFootball: { fr: "Football", en: "Football", ar: "كرة القدم" },
  sportRugby: { fr: "Rugby", en: "Rugby", ar: "الرجبي" },
  sportBasketball: { fr: "Basketball", en: "Basketball", ar: "كرة السلة" },
  sportHandball: { fr: "Handball", en: "Handball", ar: "كرة اليد" },
  sportVolleyball: { fr: "Volleyball", en: "Volleyball", ar: "الكرة الطائرة" },
  sportHockey: { fr: "Hockey", en: "Hockey", ar: "الهوكي" },
  sportSprint100200: { fr: "Sprint (100 m / 200 m)", en: "Sprint (100 m / 200 m)", ar: "عدو (100م / 200م)" },
  sport400m: { fr: "400 m", en: "400 m", ar: "400م" },
  sportMiddleDistance: { fr: "Demi-fond (800 m / 1500 m)", en: "Middle distance (800 m / 1500 m)", ar: "نصف المسافة (800م / 1500م)" },
  sportLongDistance: { fr: "Fond (5000 m / marathon)", en: "Long distance (5000 m / marathon)", ar: "المسافات الطويلة (5000م / ماراثون)" },
  sportLongJump: { fr: "Saut en longueur", en: "Long jump", ar: "الوثب الطويل" },
  sportHighJump: { fr: "Saut en hauteur", en: "High jump", ar: "الوثب العالي" },
  sportTripleJump: { fr: "Triple saut", en: "Triple jump", ar: "الوثب الثلاثي" },
  sportCyclingTrack: { fr: "Cyclisme sur piste", en: "Track cycling", ar: "ركوب الدراجات على المضمار" },
  sportTennis: { fr: "Tennis", en: "Tennis", ar: "التنس" },
  sportSkiAlpin: { fr: "Ski alpin", en: "Alpine skiing", ar: "التزلج الألبي" },
  sportOther: { fr: "Autre (profil équilibré)", en: "Other (balanced profile)", ar: "أخرى (ملف متوازن)" },
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
  teamLogo: { fr: "Logo de l'équipe", en: "Team logo", ar: "شعار الفريق" },
  athletePhoto: { fr: "Photo de l'athlète", en: "Athlete photo", ar: "صورة الرياضي" },
  imageChoose: { fr: "Choisir", en: "Choose", ar: "اختيار" },
  imageChange: { fr: "Changer", en: "Change", ar: "تغيير" },
  imageRemove: { fr: "Retirer", en: "Remove", ar: "إزالة" },
  imageTooLarge: { fr: "Image trop volumineuse (max 10 MB).", en: "Image too large (max 10 MB).", ar: "الصورة كبيرة جداً (الحد 10 MB)." },
  imageNotImage: { fr: "Choisissez un fichier image.", en: "Please choose an image file.", ar: "يرجى اختيار ملف صورة." },
  imagePickFailed: { fr: "Impossible de lire cette image.", en: "Could not read that image.", ar: "تعذر قراءة هذه الصورة." },

  // ---- Player detail ----
  playerNotFound: { fr: "Joueur introuvable.", en: "Player not found.", ar: "اللاعب غير موجود." },
  testHistory: { fr: "Historique des tests", en: "Test history", ar: "سجل الاختبارات" },
  noTestsYet: { fr: "Aucun test enregistré. Lancez le premier", en: "No tests yet. Run the first one", ar: "لا توجد اختبارات مسجلة بعد. ابدأ أول اختبار" },
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
  loadKg: { fr: "\u00a0 \u00a0Charge", en: "Load", ar: "\u00a0 \u00a0الحمولة" },
  jumpHeightCm: { fr: "Hauteur de saut (cm)", en: "Jump (cm)", ar: "ارتفاع القفز (سم)" },
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
  protocol: { fr: "Protocole", en: "Protocol", ar: "البروتوكول" },
  conditions: { fr: "Conditions", en: "Conditions", ar: "الظروف" },
  notes: { fr: "Notes", en: "Notes", ar: "ملاحظات" },
  step1Athlete: { fr: "Athlète", en: "Athlete", ar: "الرياضي" },
  step2Protocol: { fr: "Protocole", en: "Protocol", ar: "البروتوكول" },
  step3Conditions: { fr: "Conditions", en: "Conditions", ar: "الظروف" },
  step4Splits: { fr: "Splits", en: "Splits", ar: "الأزمنة الجزئية" },
  step5Notes: { fr: "Notes", en: "Notes", ar: "ملاحظات" },
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
  shoeCorrection: { fr: "Une correction est appliquée selon la combinaison chaussure × surface.", en: "A correction is applied per shoe × surface combination.", ar: "يُطبَّق تصحيح حسب توليفة الحذاء × الأرضية." },
  temperature: { fr: "Temp (°C)", en: "Temp (°C)", ar: "الحرارة (°م)" },
  pressure: { fr: "Pression (hPa)", en: "Pressure (hPa)", ar: "الضغط (hPa)" },
  windMs: { fr: "Vent (m/s)", en: "Wind (m/s)", ar: "الرياح (م/ث)" },
  windDirection: { fr: "Direction du vent", en: "Wind direction", ar: "اتجاه الرياح" },
  tailwind: { fr: "Propulsion", en: "Tailwind", ar: "دافعة" },
  neutral: { fr: "Neutre", en: "Neutral", ar: "محايدة" },
  headwind: { fr: "Résistance", en: "Headwind", ar: "معاكسة" },
  windHint: { fr: "Propulsion = vent qui pousse l'athlète ·\nRésistance = vent qui freine l'athlète · ", en: "Tailwind = wind pushes the athlete ·\nHeadwind = wind slows down the athlete · ", ar: "دافعة = رياح تدفع الرياضي ·\nمعاكسة = رياح تعيق الرياضي · " },
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
  splitsHint: { fr: "Utilisez la caméra ou l'analyse vidéo IA pour extraire les temps depuis une vidéo de course.", en: "Use the camera or AI video analysis to extract times from a run video.", ar: "استخدم الكاميرا أو تحليل الفيديو بالذكاء الاصطناعي لاستخراج الأزمنة من الفيديو." },
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

  // ---- Method & references (jump) ----
  methodLabel: { fr: "Méthode :", en: "Method:", ar: "المنهجية:" },
  refsLabel: { fr: "Références :", en: "References:", ar: "المراجع:" },
  methodJumpBody: { fr: "sauts verticaux à charges croissantes. Pour chaque essai, F = (m+ml)·g·(h/hPO + 1) / m et V = √(g·h/2). Régression linéaire F = F0 − Sfv·V donne F0, V0, Pmax = F0·V0/4.", en: "vertical jumps at increasing loads. For each trial, F = (m+ml)·g·(h/hPO + 1) / m and V = √(g·h/2). Linear regression F = F0 − Sfv·V gives F0, V0, Pmax = F0·V0/4.", ar: "قفزات عمودية بأحمال متزايدة. لكل محاولة F = (m+ml)·g·(h/hPO + 1) / m و V = √(g·h/2). الانحدار الخطي F = F0 − Sfv·V يعطي F0 وV0 وPmax = F0·V0/4." },
  methodSfvOpt: { fr: "pente F-V théorique qui maximise la hauteur de saut à Pmax constant (iso-puissance). FVimb = (Sfv − Sfv,opt) / Sfv,opt × 100.", en: "theoretical F-V slope that maximises jump height at constant Pmax (iso-power). FVimb = (Sfv − Sfv,opt) / Sfv,opt × 100.", ar: "الانحدار النظري F-V الذي يعظّم ارتفاع القفز عند Pmax ثابت. FVimb = (Sfv − Sfv,opt) / Sfv,opt × 100." },
  methodRefsJump: { fr: "Samozino et al. (2008, 2012, 2014); Jiménez-Reyes et al. (2017) pour l'individualisation par sport.", en: "Samozino et al. (2008, 2012, 2014); Jiménez-Reyes et al. (2017) for sport-specific individualisation.", ar: "سامودزينو وآخرون (2008، 2012، 2014)؛ خيمينيز-رييس وآخرون (2017) للتخصيص حسب الرياضة." },
  methodSprintBody: { fr: "modèle exponentiel v(t) = Vmax·(1 − e^(−t/τ)) ajusté sur les splits. Force horizontale F_h = m·a + F_aero, puis régression F-V linéaire et Pmax = F0·V0/4.", en: "exponential model v(t) = Vmax·(1 − e^(−t/τ)) fitted on splits. Horizontal force F_h = m·a + F_aero, then linear F-V regression and Pmax = F0·V0/4.", ar: "النموذج الأسي v(t) = Vmax·(1 − e^(−t/τ)) موائم على الأزمنة الجزئية. القوة الأفقية F_h = m·a + F_aero، ثم انحدار F-V خطي وPmax = F0·V0/4." },
  methodRfDrf: { fr: "ratio de force horizontale = F_h / √(F_h² + g²) × 100 ; DRF = pente de RF vs V (Morin & Samozino 2016).", en: "horizontal force ratio = F_h / √(F_h² + g²) × 100; DRF = slope of RF vs V (Morin & Samozino 2016).", ar: "نسبة القوة الأفقية = F_h / √(F_h² + g²) × 100 ؛ DRF = ميل RF بدلالة V (مورين وسامودزينو 2016)." },
  methodRefsSprint: { fr: "Morin & Samozino (2016); Cross et al. (2017); Jiménez-Reyes et al. (2019).", en: "Morin & Samozino (2016); Cross et al. (2017); Jiménez-Reyes et al. (2019).", ar: "مورين وسامودزينو (2016)؛ كروس وآخرون (2017)؛ خيمينيز-رييس وآخرون (2019)." },

  // ---- R² explanation ----
  r2Explanation: { fr: "R² = coefficient de détermination : indique la fiabilité du test ( 1 = parfait ).", en: "R² = coefficient of determination: indicates test reliability (1 = perfect).", ar: "R² = معامل التحديد: يشير إلى موثوقية الاختبار (1 = مثالي)." },
  r2Excellent: { fr: "Excellent ajustement : F0, V0 et Pmax sont fiables.", en: "Excellent fit: F0, V0 and Pmax are reliable.", ar: "ملاءمة ممتازة: F0 و V0 و Pmax موثوقة." },
  r2Good: { fr: "Ajustement correct : interpréter avec une certaine prudence.", en: "Acceptable fit: interpret with some caution.", ar: "ملاءمة مقبولة: تُفسَّر بحذر." },
  r2Poor: { fr: "Ajustement faible : vérifier la qualité des essais avant d'exploiter F0/V0/Pmax.", en: "Weak fit: check trial quality before relying on F0/V0/Pmax.", ar: "ملاءمة ضعيفة: تحقق من جودة المحاولات قبل استخدام F0/V0/Pmax." },

  // ---- Target summary ----
  targetPrefix: { fr: "Cible", en: "Target", ar: "المستهدف" },

  // ---- Sprint report extras ----
  footwearAdjLabel: { fr: "Correction adhérence appliquée", en: "Grip correction applied", ar: "تصحيح الاحتكاك مطبَّق" },
  onMeasuredTimes: { fr: "sur les temps mesurés", en: "on measured times", ar: "على الأزمنة المقاسة" },
  aeroDefaultsUsed: { fr: "Correction aérodynamique estimée avec valeurs par défaut.", en: "Aerodynamic correction estimated with default values.", ar: "تصحيح ديناميكي هوائي مُقدَّر بالقيم الافتراضية." },
  aeroCorrection: { fr: "Correction aérodynamique", en: "Aerodynamic correction", ar: "التصحيح الديناميكي الهوائي" },
  windEffect: { fr: "effet vent", en: "wind effect", ar: "تأثير الرياح" },
  illegalWindNote: { fr: "vent > 2 m/s (non homologable IAAF)", en: "wind > 2 m/s (not IAAF-legal)", ar: "رياح > 2 م/ث (غير معتمد IAAF)" },
  propulsion: { fr: "propulsion", en: "tailwind", ar: "دافعة" },
  resistance: { fr: "résistance", en: "headwind", ar: "معاكسة" },
  interpretationLabel: { fr: "Interprétation", en: "Interpretation", ar: "التفسير" },
  jumpTargetSuffix: { fr: "(Jiménez-Reyes)", en: "(Jiménez-Reyes)", ar: "(خيمينيز-رييس)" },

  // ---- Sprint interpretation titles ----
  interp_force_deficit: { fr: "Déficit de FORCE horizontale", en: "Horizontal FORCE deficit", ar: "نقص القوة الأفقية" },
  interp_velocity_deficit: { fr: "Déficit de VITESSE maximale", en: "Maximum VELOCITY deficit", ar: "نقص السرعة القصوى" },
  interp_power_deficit: { fr: "Déficit de PUISSANCE globale", en: "Overall POWER deficit", ar: "نقص القدرة الإجمالية" },
  interp_orientation_deficit: { fr: "Déficit d'ORIENTATION horizontale", en: "Horizontal ORIENTATION deficit", ar: "نقص التوجيه الأفقي" },
  interp_balanced: { fr: "Profil sprint ÉQUILIBRÉ", en: "BALANCED sprint profile", ar: "ملف عدو متوازن" },
  interp_force_deficit_desc: { fr: "F0 bas et accélération initiale limitée. Travailler la force maximale et l'expression de force horizontale.", en: "Low F0 and limited initial acceleration. Focus on maximal strength and horizontal force expression.", ar: "F0 منخفض وتسارع أولي محدود. اعمل على القوة القصوى وتعبير القوة الأفقية." },
  interp_velocity_deficit_desc: { fr: "Vmax limitante alors que la force initiale est correcte. Exposer l'athlète à de hautes vitesses.", en: "Vmax is the limiter while initial force is fine. Expose the athlete to high velocities.", ar: "Vmax محدود بينما القوة الأولية مقبولة. عرّض الرياضي لسرعات عالية." },
  interp_power_deficit_desc: { fr: "F0 et V0 corrects mais Pmax faible. Travail force-vitesse mixte.", en: "F0 and V0 are OK but Pmax is low. Mixed force-velocity work.", ar: "F0 وV0 جيدان لكن Pmax منخفض. عمل مختلط قوة-سرعة." },
  interp_orientation_deficit_desc: { fr: "RF faible ou DRF très négatif : la force est mal orientée vers l'avant.", en: "Low RF or very negative DRF: force is poorly oriented forward.", ar: "RF منخفض أو DRF سالب جداً: القوة موجَّهة بشكل سيء للأمام." },
  interp_balanced_desc: { fr: "Profil cohérent. Maintenir la qualité avec un travail mixte force/vitesse.", en: "Consistent profile. Maintain quality with mixed strength/speed work.", ar: "ملف متسق. حافظ على الجودة بعمل مختلط قوة/سرعة." },

  // ---- Jump recommendation titles ----
  reco_jump_force: { fr: "Déficit de FORCE détecté", en: "FORCE deficit detected", ar: "تم اكتشاف نقص في القوة" },
  reco_jump_velocity: { fr: "Déficit de VITESSE détecté", en: "VELOCITY deficit detected", ar: "تم اكتشاف نقص في السرعة" },
  reco_jump_balanced: { fr: "Profil ÉQUILIBRÉ ✓", en: "BALANCED profile ✓", ar: "ملف متوازن ✓" },
  reco_jump_force_desc: { fr: "Priorisez le développement de la force maximale et de la force-puissance lourde pour rééquilibrer le profil.", en: "Prioritise maximal strength and heavy force-power to rebalance the profile.", ar: "أعطِ الأولوية لتطوير القوة القصوى والقوة-القدرة الثقيلة لإعادة توازن الملف." },
  reco_jump_velocity_desc: { fr: "Priorisez la pliométrie, les mouvements explosifs et les sauts à faible charge pour développer la vitesse de contraction.", en: "Prioritise plyometrics, explosive movements and light-load jumps to develop contraction velocity.", ar: "أعطِ الأولوية للبلايومترية والحركات الانفجارية والقفزات بحمل خفيف لتطوير سرعة الانقباض." },
  reco_jump_balanced_desc: { fr: "Maintenir le profil avec un travail mixte force-vitesse.", en: "Maintain the profile with mixed force-velocity work.", ar: "حافظ على الملف بعمل مختلط قوة-سرعة." },
  imbalanceOf: { fr: "Imbalance de", en: "Imbalance of", ar: "عدم التوازن" },

  // ---- Sprint recommendation titles ----
  reco_sprint_force: { fr: "Déficit de FORCE HORIZONTALE", en: "HORIZONTAL FORCE deficit", ar: "نقص القوة الأفقية" },
  reco_sprint_velocity: { fr: "Déficit de VITESSE MAX", en: "MAX VELOCITY deficit", ar: "نقص السرعة القصوى" },
  reco_sprint_balanced: { fr: "Profil sprint ÉQUILIBRÉ ✓", en: "BALANCED sprint profile ✓", ar: "ملف عدو متوازن ✓" },
  reco_sprint_force_desc: { fr: "La capacité à produire de la force orientée horizontalement est limitée. Travail de poussée et d'orientation prioritaire.", en: "Ability to produce horizontally oriented force is limited. Push and orientation work is the priority.", ar: "القدرة على إنتاج قوة أفقية محدودة. الأولوية لعمل الدفع والتوجيه." },
  reco_sprint_velocity_desc: { fr: "Bonne application de force mais vitesse maximale limitante.", en: "Good force application but maximum velocity is the limiter.", ar: "تطبيق قوة جيد لكن السرعة القصوى هي المحدِّد." },

  // ---- Export (PDF / DOCX) ----
  exportBadgeJump: { fr: "PROFIL F-V — SAUT VERTICAL", en: "F-V PROFILE — VERTICAL JUMP", ar: "ملف F-V — القفز العمودي" },
  exportBadgeSprint: { fr: "PROFIL F-V — SPRINT LINÉAIRE", en: "F-V PROFILE — LINEAR SPRINT", ar: "ملف F-V — العدو الخطي" },
  mainIndicators: { fr: "Indicateurs principaux", en: "Main indicators", ar: "المؤشرات الرئيسية" },
  testConditions: { fr: "Conditions du test", en: "Test conditions", ar: "شروط الاختبار" },
  fvCurveSection: { fr: "Courbe Force-Vitesse", en: "Force-Velocity curve", ar: "منحنى القوة-السرعة" },
  fvSlope: { fr: "Pente F-V", en: "F-V slope", ar: "ميل F-V" },
  optimalSlope: { fr: "Pente optimale", en: "Optimal slope", ar: "الميل الأمثل" },
  profileLabel: { fr: "Profil", en: "Profile", ar: "الملف" },
  hMax: { fr: "h max", en: "h max", ar: "h max" },
  imbalanceUnit: { fr: "% (déséquilibre)", en: "% (imbalance)", ar: "% (اختلال)" },
  fitQualityUnit: { fr: "qualité d'ajustement", en: "fit quality", ar: "جودة الملاءمة" },
  cmBwUnit: { fr: "cm (PC)", en: "cm (BW)", ar: "سم (وزن الجسم)" },
  pushOff: { fr: "Poussée (hPO)", en: "Push-off (hPO)", ar: "الدفع (hPO)" },
  addLoadKg: { fr: "Charge add. (kg)", en: "Add. load (kg)", ar: "حمل إضافي (كغ)" },
  colNum: { fr: "#", en: "#", ar: "#" },
  colHeightCm: { fr: "Hauteur (cm)", en: "Height (cm)", ar: "الارتفاع (سم)" },
  colForceRel: { fr: "F (N/kg)", en: "F (N/kg)", ar: "F (ن/كغ)" },
  colVelocityMs: { fr: "V (m/s)", en: "V (m/s)", ar: "V (م/ث)" },
  colDistanceM: { fr: "Distance (m)", en: "Distance (m)", ar: "المسافة (م)" },
  colMeasuredS: { fr: "Mesuré (s)", en: "Measured (s)", ar: "مقاس (ث)" },
  colModelS: { fr: "Modèle (s)", en: "Model (s)", ar: "النموذج (ث)" },
  colExercise: { fr: "Exercice", en: "Exercise", ar: "التمرين" },
  colSetsReps: { fr: "Séries × Reps", en: "Sets × Reps", ar: "مجموعات × تكرارات" },
  colIntensity: { fr: "Intensité", en: "Intensity", ar: "الشدة" },
  pageLabel: { fr: "page", en: "page", ar: "صفحة" },
  unknownAthlete: { fr: "Athlète inconnu", en: "Unknown athlete", ar: "رياضي غير معروف" },
  tblIndicator: { fr: "Indicateur", en: "Indicator", ar: "المؤشر" },
  tblValue: { fr: "Valeur", en: "Value", ar: "القيمة" },
  tblUnit: { fr: "Unité", en: "Unit", ar: "الوحدة" },
  reportTitleJump: { fr: "Profil Force-Vitesse — Saut vertical", en: "Force Velocity profile — Vertical jump", ar: "ملف القوة-السرعة — القفز العمودي" },
  reportTitleSprint: { fr: "Profil Force-Vitesse — Sprint linéaire", en: "Force Velocity profile — Linear sprint", ar: "ملف القوة-السرعة — العدو الخطي" },
  nameLabel: { fr: "NOM", en: "NAME", ar: "الاسم" },
  sportLabel: { fr: "SPORT", en: "SPORT", ar: "الرياضة" },
  massLabelUp: { fr: "MASSE", en: "MASS", ar: "الكتلة" },
  loadsKg: { fr: "Charges (kg)", en: "Loads (kg)", ar: "الأحمال (كغ)" },
  forceNkg: { fr: "Force (N/kg)", en: "Force (N/kg)", ar: "القوة (ن/كغ)" },
  velocityMs: { fr: "Vitesse (m/s)", en: "Velocity (m/s)", ar: "السرعة (م/ث)" },
  fitQualityWeak: { fr: "Ajustement faible : vérifier la qualité des essais avant de se fier à F0/V0/Pmax.", en: "Weak fit: check trial quality before relying on F0/V0/Pmax.", ar: "ملاءمة ضعيفة: تحقق من جودة المحاولات قبل الاعتماد على F0/V0/Pmax." },
  fitQualityModerate: { fr: "Ajustement modéré : F0/V0/Pmax utilisables avec précaution.", en: "Moderate fit: F0/V0/Pmax usable with caution.", ar: "ملاءمة متوسطة: يمكن استخدام F0/V0/Pmax بحذر." },
  fitQualityGood: { fr: "Bon ajustement : F0/V0/Pmax fiables.", en: "Good fit: F0/V0/Pmax are reliable.", ar: "ملاءمة جيدة: قيم F0/V0/Pmax موثوقة." },
  interpretationPrefix: { fr: "INTERPRÉTATION :", en: "INTERPRETATION:", ar: "التفسير:" },

  // ---- Onboarding ----
  onbSkip: { fr: "Passer", en: "Skip", ar: "تخطي" },
  onbNext: { fr: "Suivant", en: "Next", ar: "التالي" },
  onbPrev: { fr: "Précédent", en: "Back", ar: "السابق" },
  onbStart: { fr: "Commencer", en: "Get started", ar: "لنبدأ" },
  onbReplay: { fr: "Revoir l'introduction", en: "Replay onboarding", ar: "إعادة الجولة التعريفية" },
  onb1Title: { fr: "Bienvenue dans votre labo de performance de poche", en: "Welcome to your pocket size performance lab", ar: "مرحباً بك في مختبر الأداء بحجم الجيب" },
  onb1Sub: { fr: "Créons ensemble votre premier test en quelques étapes.", en: "Let's set you up in a few quick steps", ar: "لنقم بإعدادك في بضع خطوات." },
  onb2Title: { fr: "Langue & apparence", en: "Language & appearance", ar: "اللغة والمظهر" },
  onb2Sub: { fr: "Choisissez votre langue, votre thème et votre couleur d'accent. Vous pourrez les changer à tout moment depuis les réglages.", en: "Pick your language, theme and accent color. You can change them anytime from settings.", ar: "اختر لغتك ومظهرك ولون التمييز. يمكنك تغييرها في أي وقت من الإعدادات." },
  onb3Title: { fr: "Équipes & athlètes", en: "Teams & athletes", ar: "الفرق والرياضيون" },
  onb3Sub: { fr: "Regroupez vos athlètes par équipes et choisissez leur sport pour définir le profil Force–Velocity cible.", en: "Group your athletes by teams and choose their sport to set up the target Force Velocity profile", ar: "جمّع رياضييك في فرق واختر رياضتهم لإعداد ملف القوة والسرعة المستهدف" },
  onb3Cta: { fr: "Créer votre première équipe", en: "Create your first team", ar: "أنشئ فريقك الأول" },
  onb4Title: { fr: "Lancez un test", en: "Run a test", ar: "أجرِ اختباراً" },
  onb4Sub: { fr: "Deux protocoles disponibles : Saut vertical chargé (F-V vertical) et Sprint linéaire (F-V horizontal).", en: "Two protocols available: loaded Vertical Jump (vertical F-V) and Linear Sprint (horizontal F-V).", ar: "بروتوكولان متاحان: القفز العمودي المحمّل (قوة-سرعة عمودي) والعدو الخطي (قوة-سرعة أفقي)." },
  onb4Cta: { fr: "Nouveau test", en: "New test", ar: "اختبار جديد" },
  onb5Title: { fr: "Sauvegarde & rapports", en: "Backup & reports", ar: "النسخ الاحتياطي والتقارير" },
  onb5Sub: { fr: "Sauvegardez vos données sur Google Drive, iCloud ou un fichier .slfv. Exportez chaque rapport en Word ou PDF.", en: "Back up your data to Google Drive, iCloud or a .slfv file. Export every report as Word or PDF.", ar: "احفظ بياناتك على Google Drive أو iCloud أو ملف .slfv. صدّر كل تقرير بصيغة Word أو PDF." },
  onbTourGotIt: { fr: "OK", en: "Got it", ar: "حسناً" },
  onbTourTeamTitle: { fr: "Créez votre première équipe", en: "Create your first team", ar: "أنشئ فريقك الأول" },
  onbTourTeamDesc: { fr: "Cliquez sur ce bouton pour ajouter une équipe et lui associer un sport.", en: "Tap this button to add a team and pick its sport.", ar: "انقر هذا الزر لإضافة فريق واختيار رياضته." },
  onbTourPlayerTitle: { fr: "Ajoutez vos athlètes", en: "Add your athletes", ar: "أضف رياضييك" },
  onbTourPlayerDesc: { fr: "Saisissez un athlète manuellement, ou importez une liste depuis un PDF, Word ou une image.", en: "Add athletes one by one, or import a list from a PDF, Word file or image.", ar: "أضف رياضياً يدوياً، أو استورد قائمة من PDF أو Word أو صورة." },

  // ---- PWA install ----
  installTitle: { fr: "Installer FV PocketLab", en: "Install FV PocketLab", ar: "تثبيت FV PocketLab" },
  installSubtitle: { fr: "Installez l'app pour sécuriser vos données et y accéder comme une vraie application.", en: "Install the app to keep your data safe and launch it like a native app.", ar: "ثبّت التطبيق لحماية بياناتك وتشغيله كتطبيق أصلي." },
  installIosStep1: { fr: "Appuyez sur le bouton Partager en bas de Safari.", en: "Tap the Share button at the bottom of Safari.", ar: "اضغط على زر المشاركة أسفل Safari." },
  installIosStep2: { fr: "Faites défiler puis choisissez « Sur l'écran d'accueil ».", en: "Scroll down and tap \"Add to Home Screen\".", ar: "مرّر واختر «إضافة إلى الشاشة الرئيسية»." },
  installIosStep3: { fr: "Confirmez avec « Ajouter » — l'icône FV apparaîtra.", en: "Confirm with \"Add\" — the FV icon will appear.", ar: "أكّد بـ«إضافة» — ستظهر أيقونة FV." },
  installAndroidCta: { fr: "Installer maintenant", en: "Install now", ar: "التثبيت الآن" },
  installAndroidHint: { fr: "Sinon, ouvrez le menu ⋮ du navigateur et choisissez « Installer l'application ».", en: "Otherwise open your browser's ⋮ menu and choose \"Install app\".", ar: "أو افتح قائمة ⋮ في المتصفح واختر «تثبيت التطبيق»." },
  installManualStep1: {
    fr: "Dans Chrome ou Edge, cliquez sur l'icône d'installation dans la barre d'adresse (écran avec une flèche).",
    en: "In Chrome or Edge, click the install icon in the address bar (a screen with an arrow).",
    ar: "في Chrome أو Edge، انقر أيقونة التثبيت في شريط العنوان (شاشة مع سهم).",
  },
  installManualStep2: {
    fr: "Ou ouvrez le menu ⋮ et choisissez « Installer l'application ».",
    en: "Or open the ⋮ menu and choose \"Install app\".",
    ar: "أو افتح قائمة ⋮ واختر «تثبيت التطبيق».",
  },
  installManualStep3: {
    fr: "Confirmez — l'icône FV apparaîtra comme une application.",
    en: "Confirm — the FV icon will appear as an app.",
    ar: "أكّد — ستظهر أيقونة FV كتطبيق.",
  },
  installFirefoxHint: { fr: "Pour installer FV PocketLab, ouvrez cette page dans Chrome, Edge ou Safari.", en: "To install FV PocketLab, open this page in Chrome, Edge or Safari.", ar: "لتثبيت FV PocketLab، افتح هذه الصفحة في Chrome أو Edge أو Safari." },
  installLater: { fr: "Plus tard", en: "Later", ar: "لاحقاً" },
  installBanner: { fr: "Installez FV PocketLab pour ne rien perdre.", en: "Install FV PocketLab so nothing gets lost.", ar: "ثبّت FV PocketLab حتى لا تفقد شيئاً." },
  installBannerCta: { fr: "Installer", en: "Install", ar: "تثبيت" },
  installedToast: { fr: "FV PocketLab est installée. Merci !", en: "FV PocketLab is installed. Thanks!", ar: "تم تثبيت FV PocketLab. شكراً!" },

  // ---- Marketing landing ----
  landNavFeatures: { fr: "Fonctionnalités", en: "Features", ar: "المزايا" },
  landNavHow: { fr: "Méthode", en: "How it works", ar: "كيف يعمل" },
  landNavPricing: { fr: "Tarifs", en: "Pricing", ar: "الأسعار" },
  landMenu: { fr: "Menu", en: "Menu", ar: "القائمة" },
  landCloseMenu: { fr: "Fermer le menu", en: "Close menu", ar: "إغلاق القائمة" },
  landLangMenu: { fr: "Langue", en: "Language", ar: "اللغة" },

  landVerbProfile: { fr: "Profiler.", en: "Profile.", ar: "كوّن الملف." },
  landVerbTest: { fr: "Tester.", en: "Test.", ar: "اختبر." },
  landVerbAnalyze: { fr: "Analyser.", en: "Analyze.", ar: "حلّل." },
  landVerbSprint: { fr: "Sprinter.", en: "Sprint.", ar: "أعدُ." },
  landVerbJump: { fr: "Sauter.", en: "Jump.", ar: "اقفز." },
  landVerbExport: { fr: "Exporter.", en: "Export.", ar: "صدّر." },
  landVerbCalibrate: { fr: "Calibrer.", en: "Calibrate.", ar: "عاير." },
  landVerbRecord: { fr: "Filmer.", en: "Record.", ar: "سجّل." },
  landVerbSplit: { fr: "Découper.", en: "Split.", ar: "قسّم." },
  landVerbReport: { fr: "Rapporter.", en: "Report.", ar: "قرّر." },
  landVerbRoster: { fr: "Roster.", en: "Roster.", ar: "القائمة." },
  landVerbMeasure: { fr: "Mesurer.", en: "Measure.", ar: "قِس." },

  landHeroTitle: {
    fr: "Laboratoire de performance de poche",
    en: "Performance Pocket size Laboratory",
    ar: "مختبر أداء بحجم الجيب",
  },
  landHeroSub: {
    fr: "N'importe quand, n'importe où, le profilage de performance n'a jamais été aussi simple.",
    en: "Anytime, anywhere, performance profiling has never been easier.",
    ar: "في أي وقت وأي مكان، لم يكن تحليل الأداء أسهل من الآن.",
  },
  landHeroFvForceTitle: {
    fr: "Développement de la puissance force",
    en: "Force-power development",
    ar: "تنمية قدرة القوة",
  },
  landHeroFvSpeedTitle: {
    fr: "Développement de la puissance vitesse",
    en: "Velocity-power development",
    ar: "تنمية قدرة السرعة",
  },
  landHeroFvAthlete: {
    fr: "Profil force-vitesse de l'athlète",
    en: "Athlete force–velocity profile",
    ar: "ملف القوة-السرعة للرياضي",
  },
  landHeroFvOptimal: {
    fr: "Profil force-vitesse optimal",
    en: "Optimal force–velocity profile",
    ar: "ملف القوة-السرعة الأمثل",
  },
  landStartFree: { fr: "Commencer gratuitement", en: "Start for free", ar: "ابدأ مجاناً" },

  landWhoOverline: { fr: "Public", en: "Audience", ar: "الجمهور" },
  landWhoTitle: { fr: "Pour qui FV PocketLab ?", en: "Who is FV PocketLab for ?", ar: "لمن FV PocketLab ؟" },
  landWhoCoach: { fr: "Entraîneurs", en: "Coaches", ar: "مدربون" },
  landWhoSC: { fr: "Préparation physique", en: "S&C staff", ar: "الإعداد البدني" },
  landWhoLab: { fr: "Laboratoires", en: "Labs", ar: "مختبرات" },
  landWhoClub: { fr: "Clubs", en: "Clubs", ar: "أندية" },
  landWhoResearch: { fr: "Chercheurs", en: "Researchers", ar: "باحثون" },
  landWhoAthlete: { fr: "Athlètes", en: "Athletes", ar: "رياضيون" },

  landProtoOverline: { fr: "Avantages", en: "Advantages", ar: "المزايا" },
  landProtoTitle: { fr: "Rapport Test Sprint Saut", en: "Sprint Jump Test Report", ar: "تقرير اختبار العدو والقفز" },
  landFeatWordSprint: { fr: "Sprint", en: "Sprint", ar: "عدو" },
  landFeatWordJump: { fr: "Saut", en: "Jump", ar: "قفز" },
  landFeatWordReport: { fr: "Rapport", en: "Report", ar: "تقرير" },
  landProtoSprintTitle: { fr: "Test de sprint", en: "Sprint test", ar: "اختبار العدو" },
  landProtoSprintBody: {
    fr: "Profil force-vitesse complet pour le sprint linéaire.",
    en: "Complete Force - Velocity profile for linear sprint",
    ar: "ملف قوة-سرعة كامل للعدو الخطي.",
  },
  landProtoJumpTitle: { fr: "Test de saut", en: "Jump test", ar: "اختبار القفز" },
  landProtoJumpBody: {
    fr: "Profil force-vitesse complet pour le saut vertical.",
    en: "Complete Force - Velocity profile for vertical jump",
    ar: "ملف قوة-سرعة كامل للقفز العمودي.",
  },
  landProtoReportTitle: { fr: "Rapports de test", en: "Test reports", ar: "تقارير الاختبار" },
  landProtoReportBody: {
    fr: "PDF et document Word prêts à modifier et envoyer (formules Pro).",
    en: "PDF and word document ready to edit and send (Pro plans)",
    ar: "PDF ومستند Word جاهزان للتحرير والإرسال (خطط برو).",
  },

  landFeatOverline: { fr: "Fonctionnalités", en: "Features", ar: "المزايا" },
  landFeatTitle: {
    fr: "Pourquoi choisir FV PocketLab ?",
    en: "Why choosing FV PocketLab ?",
    ar: "لماذا تختار FV PocketLab ؟",
  },
  landFeatVideoTitle: { fr: "Analyse vidéo sur l'appareil", en: "On-device video analysis", ar: "تحليل فيديو على الجهاز" },
  landFeatVideoBody: {
    fr: "Pose, splits et hauteur de saut se calculent dans le navigateur. Rien n'est envoyé pour être analysé ailleurs.",
    en: "Pose, splits, and jump height are computed in the browser. Nothing is sent away to be analyzed.",
    ar: "يُحسب الوضع والأزمنة وارتفاع القفز في المتصفح. لا يُرسل شيء لتحليله في مكان آخر.",
  },
  landFeatLocalTitle: { fr: "Local d'abord", en: "Local-first", ar: "محلي أولاً" },
  landFeatLocalBody: {
    fr: "Équipes, athlètes et tests vivent dans IndexedDB. Fermer l'onglet ne les efface pas. Pas de compte cloud obligatoire pour travailler.",
    en: "Teams, athletes, and tests live in IndexedDB. Closing the tab does not wipe them. You do not need a cloud account to work.",
    ar: "تعيش الفرق والرياضيون والاختبارات في IndexedDB. إغلاق التبويب لا يمسحها. لا تحتاج حساب سحابة للعمل.",
  },
  landFeatReportTitle: { fr: "Exports PDF et Word", en: "PDF and Word exports", ar: "تصدير PDF وWord" },
  landFeatReportBody: {
    fr: "Un rapport de séance avec profil, graphiques et notes — sur les formules Pro.",
    en: "A session report with profile, charts, and notes — on Pro plans.",
    ar: "تقرير جلسة بالملف والرسوم والملاحظات — على خطط برو.",
  },
  landFeatBackupTitle: { fr: "Sauvegarde de compte", en: "Account backup", ar: "نسخ احتياطي للحساب" },
  landFeatBackupBody: {
    fr: "Les formules Pro enregistrent un fichier privé lié au compte pour retrouver le roster sur un autre appareil.",
    en: "Pro plans store a private file on your account so you can restore the roster on another device.",
    ar: "تحفظ خطط برو ملفاً خاصاً على حسابك لاستعادة القائمة على جهاز آخر.",
  },

  landPriceOverline: { fr: "Tarifs", en: "Pricing", ar: "الأسعار" },
  landPriceTitle: { fr: "Payez ce dont vous avez besoin", en: "Pay for what you need", ar: "ادفع مقابل ما تحتاجه" },
  landPriceSub: {
    fr: "Commencez gratuitement. Passez à l'offre supérieure pour plus d'usage, des fonctionnalités supplémentaires et un accès anticipé aux éléments à venir.",
    en: "Start free. Upgrade for more usage, additional features and early access for upcoming elements.",
    ar: "ابدأ مجاناً. رقِّ للمزيد من الاستخدام، وميزات إضافية، ووصول مبكر للعناصر القادمة.",
  },
  landPriceMonthly: { fr: "Mensuel", en: "Monthly", ar: "شهري" },
  landPriceYearly: { fr: "Annuel", en: "Yearly", ar: "سنوي" },
  landPriceBest: { fr: "Meilleur rapport", en: "Best value", ar: "الأفضل قيمة" },
  landPerMonth: { fr: "/ mois", en: "/ month", ar: "/ شهر" },
  landPerYear: { fr: "/ an", en: "/ year", ar: "/ سنة" },
  landOnce: { fr: "paiement unique", en: "one-time", ar: "دفعة واحدة" },
  landPriceExclTax: { fr: "hors taxes", en: "excluding tax", ar: "غير شامل الضريبة" },
  landPriceCtaFree: { fr: "Créer un profil", en: "Create a profile", ar: "أنشئ حساباً" },
  landPriceCtaPaid: { fr: "Continuer", en: "Continue", ar: "متابعة" },
  landStartPro: {
    fr: "Commencez votre formule Pro",
    en: "Start your pro plan (3 days free trial)",
    ar: "ابدأ خطة برو (3 أيام تجريبية)",
  },
  landFeatTeams: { fr: "{n} équipe", en: "{n} team", ar: "{n} فريق" },
  landFeatAthletes: { fr: "{n} athlètes par équipe", en: "{n} athletes per team", ar: "{n} رياضيين لكل فريق" },
  landFeatTests: { fr: "{n} tests par athlète par mois", en: "{n} tests per athlete / month", ar: "{n} اختبارات لكل رياضي / شهر" },
  landFeatTeamsUnlim: { fr: "Équipes illimitées", en: "Unlimited teams", ar: "فرق بلا حد" },
  landFeatAthletesUnlim: { fr: "Athlètes illimités", en: "Unlimited athletes", ar: "رياضيون بلا حد" },
  landFeatTestsUnlim: { fr: "Tests illimités", en: "Unlimited tests", ar: "اختبارات بلا حد" },
  landFeatVideoOn: { fr: "Analyse vidéo", en: "Video analysis", ar: "تحليل فيديو" },
  landFeatReportsOn: { fr: "Exports PDF et DOCX", en: "PDF and DOCX exports", ar: "تصدير PDF وDOCX" },
  landFeatImportOn: {
    fr: "Import automatique de listes d'athlètes",
    en: "Athletes list automatic import",
    ar: "استيراد تلقائي لقوائم الرياضيين",
  },
  landFeatBackupOn: { fr: "Sauvegarde de compte", en: "Account backup", ar: "نسخ احتياطي للحساب" },
  landFeatEarlyAccess: {
    fr: "Accès anticipé aux fonctionnalités à venir",
    en: "Early access to upcoming features",
    ar: "وصول مبكر للميزات القادمة",
  },

  landCtaTitle: {
    fr: "Prêt à profiler depuis votre poche ?",
    en: "Ready to profile from your pocket ?",
    ar: "مستعد للتحليل من جيبك ؟",
  },
  landCtaSub: {
    fr: "Créez un profil gratuit. Passez en Pro quand les rapports et la sauvegarde deviennent utiles.",
    en: "Create a free profile. Move to Pro when reports and backup start to matter.",
    ar: "أنشئ ملفاً مجانياً. انتقل إلى برو عندما تصبح التقارير والنسخ مهمة.",
  },
  landFooterCopy: {
    fr: "© {y} FV PocketLab. Tous droits réservés.",
    en: "© {y} FV PocketLab. All rights reserved.",
    ar: "© {y} FV PocketLab. جميع الحقوق محفوظة.",
  },
  landFooterTag: {
    fr: "Force–velocity profiler — in your pocket",
    en: "Force–velocity profiler — in your pocket",
    ar: "محلل القوة-السرعة — في جيبك",
  },
  landFooterPrivacy: { fr: "Politique de confidentialité", en: "Privacy Policy", ar: "سياسة الخصوصية" },
  landFooterTerms: { fr: "Conditions d'utilisation", en: "Terms of Service", ar: "شروط الخدمة" },
  landFooterContact: { fr: "Contactez-nous", en: "Contact us", ar: "اتصل بنا" },
  landLegalHome: { fr: "Accueil", en: "Home", ar: "الرئيسية" },
  landContactEmail: { fr: "contact@fvpocketlab.com", en: "contact@fvpocketlab.com", ar: "contact@fvpocketlab.com" },
  landContactCta: { fr: "Envoyer un e-mail", en: "Send an email", ar: "أرسل بريداً" },

  landPrivacyP1: {
    fr: "FV PocketLab est local-first. Les vidéos de sprint et de saut sont traitées sur votre appareil. Nous n'envoyons pas la vidéo brute de test vers nos serveurs dans le flux habituel.",
    en: "FV PocketLab is local-first. Sprint and jump videos are processed on your device. We do not upload raw test video to our servers as part of the default workflow.",
    ar: "FV PocketLab محلي أولاً. تُعالَج فيديوهات العدو والقفز على جهازك. لا نرفع فيديو الاختبار الخام إلى خوادمنا في المسار الاعتيادي.",
  },
  landPrivacyP2: {
    fr: "Lorsque vous créez un compte, nous enregistrons votre e-mail et votre profil via Supabase pour vous connecter sur cet appareil et sur d'autres.",
    en: "When you create an account, we store your email and profile with Supabase so you can sign in on this device and others.",
    ar: "عند إنشاء حساب، نخزّن بريدك وملفك عبر Supabase حتى تتمكن من تسجيل الدخول على هذا الجهاز وغيره.",
  },
  landPrivacyP3: {
    fr: "Si vous passez en Pro ou Lifetime, Creem traite le paiement. Nous recevons l'état de l'abonnement pour débloquer les fonctions. Nous ne stockons pas le numéro complet de votre carte.",
    en: "If you subscribe to Pro or Lifetime, Creem processes payment. We receive plan status so we can unlock features. We do not store your full card number.",
    ar: "إذا اشتركت في برو أو مدى الحياة، يعالج Creem الدفع. نتلقى حالة الخطة لفتح الميزات. لا نخزّن رقم بطاقتك كاملاً.",
  },
  landPrivacyP4: {
    fr: "La sauvegarde Pro stocke votre roster et vos tests dans un fichier privé lié à votre compte, pour les restaurer sur un autre appareil.",
    en: "Pro account backup stores your roster and test data in a private file tied to your account so you can restore it on another device.",
    ar: "يحفظ النسخ الاحتياطي لبرو قائمتك واختباراتك في ملف خاص مربوط بحسابك لاستعادتها على جهاز آخر.",
  },
  landPrivacyP5: {
    fr: "Pour une question ou une demande de suppression de vos données, utilisez Contactez-nous.",
    en: "To ask a question or request deletion of your account data, use Contact us.",
    ar: "للأسئلة أو لطلب حذف بيانات حسابك، استخدم اتصل بنا.",
  },

  landTermsP1: {
    fr: "FV PocketLab est un outil d'entraînement pour coachs et athlètes. Ce n'est pas un avis médical et il ne diagnostique ni ne traite une blessure.",
    en: "FV PocketLab is a training tool for coaches and athletes. It is not medical advice and does not diagnose or treat injury.",
    ar: "FV PocketLab أداة تدريب للمدربين والرياضيين. ليست استشارة طبية ولا تشخّص الإصابة ولا تعالجها.",
  },
  landTermsP2: {
    fr: "Vous êtes responsable de l'usage des résultats avec vos athlètes, et du consentement lorsque vous filmez des personnes.",
    en: "You are responsible for how you use results with your athletes, and for consent when you record people.",
    ar: "أنت مسؤول عن استخدام النتائج مع رياضيك، وعن الموافقة عند تصوير أشخاص.",
  },
  landTermsP3: {
    fr: "Les formules gratuite et payantes n'ont pas les mêmes limites. Le paiement passe par Creem. Un abonnement se renouvelle jusqu'à résiliation.",
    en: "Free and paid plans have different limits. Paid checkout is handled by Creem. Subscriptions renew until you cancel.",
    ar: "للخطط المجانية والمدفوعة حدود مختلفة. يتم الدفع عبر Creem. يتجدد الاشتراك حتى تلغيه.",
  },
  landTermsP4: {
    fr: "N'abusez pas du service : pas d'accès non autorisé, pas d'usage des données d'autrui, pas d'usage illégal de l'application.",
    en: "Do not misuse the service: no unauthorized access, no abuse of other people's data, and no using the app to break the law.",
    ar: "لا تُسئ استخدام الخدمة: لا وصول غير مصرّح، ولا إساءة لبيانات الآخرين، ولا استخدام يخالف القانون.",
  },
  landTermsP5: {
    fr: "Nous pouvons mettre à jour ces conditions. Continuer à utiliser l'application après un changement vaut acceptation.",
    en: "We may update these terms. Continued use after a change means you accept the new terms.",
    ar: "قد نحدّث هذه الشروط. استمرار الاستخدام بعد التغيير يعني قبولك لها.",
  },

  landContactP1: {
    fr: "Une question sur le produit, le paiement ou vos données ? Écrivez-nous.",
    en: "Questions about the product, billing, or your data? Write to us.",
    ar: "أسئلة عن المنتج أو الدفع أو بياناتك؟ راسلنا.",
  },
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
