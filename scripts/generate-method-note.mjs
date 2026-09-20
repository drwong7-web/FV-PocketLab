import {
  AlignmentType,
  Document,
  Footer,
  Header,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from "docx";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BLUE = "1F7CC7";
const INK = "1A1A1A";
const MUTED = "475569";
const FONT = "Arial";

const EN = {
  lang: "en",
  rtl: false,
  title: "FV PocketLab — Scientific method",
  kicker: "A note for coaches, strength & conditioning staff and athletes",
  blocks: [
    {
      type: "h2",
      text: "Profiling force and velocity, not only a time or a height",
    },
    {
      type: "p",
      text: "FV PocketLab is built around force–velocity profiling: a field method that lets coaches estimate how an athlete produces force across a range of movement speeds, from a few well-controlled tests rather than a full laboratory session.",
    },
    {
      type: "p",
      text: "A stopwatch or a jump mat answers “how fast?” or “how high?”. A force–velocity profile answers why that result happened: whether the athlete is limited more by force, by velocity, or by how they apply force as speed rises. Training can then target the missing quality instead of generic power work.",
    },
    {
      type: "p",
      text: "The models in the app follow the work of Pierre Samozino and Jean-Benoît Morin, and the applied studies of Pedro Jiménez-Reyes, Matt Cross and colleagues. Video on the device is used to measure the test. The scientific core is those published field methods.",
    },
    { type: "h2", text: "Vertical jump — Samozino’s simple method" },
    {
      type: "p",
      text: "The jump protocol uses several vertical jumps with increasing additional load. The app proposes loads tied to body mass. For each trial it needs body mass, the push-off distance, and jump height.",
    },
    {
      type: "p",
      text: "From that, it reconstructs the athlete’s lower-limb profile:",
    },
    {
      type: "ul",
      items: [
        "F0 — theoretical maximal force",
        "V0 — theoretical maximal velocity",
        "Pmax — maximal mechanical power",
        "Force–velocity slope — how force falls as velocity rises",
        "Force–velocity imbalance — how far the current slope sits from the slope that would maximise jump height at the same power",
      ],
    },
    {
      type: "p",
      text: "That last idea is central. Two athletes can share the same peak power and still jump differently if one is too strong and slow and the other too fast and light. Samozino’s group showed that, for a given power, there is an optimal force–velocity balance for ballistic push-off. The app classifies the profile as force-deficient, velocity-deficient, or balanced, so the training bias can follow the athlete, not a template.",
    },
    { type: "h3", text: "Scientists and studies (jump)" },
    {
      type: "ul",
      items: [
        "Samozino, Morin, Hintzy, Belli (2008), Journal of Biomechanics — a practical method to obtain force, velocity and power during jumping from jump height, mass and push-off distance, without a force plate on every trial.",
        "Samozino, Rejc, di Prampero, Belli, Morin (2012), Medicine & Science in Sports & Exercise — the optimal force–velocity profile for ballistic movements: maximising jump height at constant power.",
        "Samozino, Edouard, Sangnier, Brughelli, Gimenez, Morin (2014) — how imbalance on that profile affects jumping performance and mechanical effectiveness.",
        "Jiménez-Reyes, Samozino, Brughelli, Morin (2017), Frontiers in Physiology — individualised training from the jump force–velocity profile; the bridge from lab theory to sport-specific programming. The app’s sport targets draw on this line of work.",
      ],
    },
    { type: "h2", text: "Linear sprint — Morin & Samozino" },
    {
      type: "p",
      text: "The sprint protocol uses a timed run (30, 40 or 60 metres) with split times, or a position–time series from video. The app fits the classic acceleration model used in this literature, then derives the horizontal force–velocity–power profile:",
    },
    {
      type: "ul",
      items: [
        "F0, V0 and Pmax — the same language as the jump, applied to sprinting",
        "RF (ratio of force) — the share of force oriented forward versus into the ground",
        "DRF — how that horizontal orientation declines as speed increases",
      ],
    },
    {
      type: "p",
      text: "Sprint performance is not only how much force the athlete can produce, but in which direction and for how long into the run. An athlete can be strong on paper and still accelerate poorly if force is not applied horizontally. Morin and Samozino made that readable for coaches: a force deficit, a velocity deficit, a power deficit, or an orientation problem.",
    },
    {
      type: "p",
      text: "Air conditions can be taken into account so air resistance is not ignored. The quality of the splits and how well the model fits the run are reported, so a noisy test is not treated as a perfect profile.",
    },
    { type: "h3", text: "Scientists and studies (sprint)" },
    {
      type: "ul",
      items: [
        "Samozino, Rabita, Dorel, Slawinski, Peyrot, Saez de Villarreal, Morin (2016), Scandinavian Journal of Medicine & Science in Sports — a simple method for force, velocity and power during sprint running from split times.",
        "Morin & Samozino (2016), International Journal of Sports Physiology and Performance — how to interpret power–force–velocity profiles for individualised training. This is the reference for reading F0, V0, Pmax, RF and DRF in practice.",
        "Cross, Brughelli, Brown, Samozino, Gill, Cronin, Morin (2017), International Journal of Sports Physiology and Performance — mechanical properties of sprinting in elite rugby union and rugby sevens: the method in high-level team sport.",
        "Jiménez-Reyes and colleagues (2019) — individualisation of the sprint force–velocity profile across sports.",
        "Supporting context used for sport references: Haugen and colleagues (2019) on sprint mechanics in team sports; Slawinski and colleagues (2017) on elite 100-metre mechanics; Giroux and colleagues (2016) on force–velocity methods, including cyclic sports.",
      ],
    },
    { type: "h2", text: "What the app adds around that science" },
    {
      type: "ul",
      items: [
        "The same mechanical language coaches already meet in papers and in tools derived from Samozino–Morin: F0, V0, Pmax, slope, imbalance, RF, DRF.",
        "On-device capture — video and pose help measure jump height and sprint splits in the field; analysis is computed on the device.",
        "Sport-oriented targets — indicative zones aggregated from the studies above. They are typical references for trained athletes, not medical norms.",
        "Test quality — how well the profile fits the trials or splits, so interpretation stays honest.",
        "A training-oriented reading — force, velocity, mixed power, or sprint orientation — not a diagnosis.",
      ],
    },
    { type: "h2", text: "How to say this to athletes, in one paragraph" },
    {
      type: "p",
      text: "You are not only timing a sprint or measuring a jump. You are building a mechanical signature: maximal force, maximal speed of the system, peak power, and — in sprinting — how well force stays forward as you accelerate. That signature is compared with an optimal balance described by Samozino’s group, and with sport-typical values from independent applied studies. The aim is a clearer training target: more force, more velocity, or better orientation, depending on your profile.",
    },
    {
      type: "p",
      text: "These results are not a medical diagnosis. They should be read by a qualified practitioner, in context: sport, calendar, injury history and technical model.",
    },
    { type: "h2", text: "Key names, in one line" },
    {
      type: "p",
      text: "Pierre Samozino and Jean-Benoît Morin (simple field force–velocity methods; optimal profile; sprint RF and DRF). Pedro Jiménez-Reyes (individualised jump and sprint training). Matt Cross and colleagues (elite rugby sprint mechanics). Additional sport context: Haugen, Slawinski, Giroux.",
    },
    { type: "h2", text: "Selected references" },
    {
      type: "ol",
      items: [
        "Samozino P, Morin J-B, Hintzy F, Belli A. A simple method for measuring force, velocity and power output during squat jump. J Biomech. 2008.",
        "Samozino P, Rejc E, di Prampero PE, Belli A, Morin J-B. Optimal force–velocity profile in ballistic movements. Med Sci Sports Exerc. 2012.",
        "Samozino P, Edouard P, Sangnier S, Brughelli M, Gimenez P, Morin J-B. Force–velocity profile: imbalance and jumping performance. 2014.",
        "Jiménez-Reyes P, Samozino P, Brughelli M, Morin J-B. Effectiveness of an individualized training based on force–velocity profiling during jumping. Front Physiol. 2017.",
        "Samozino P, Rabita G, Dorel S, et al. A simple method for measuring force, velocity and power output during sprint running. Scand J Med Sci Sports. 2016.",
        "Morin J-B, Samozino P. Interpreting power–force–velocity profiles for individualized and specific training. Int J Sports Physiol Perform. 2016.",
        "Cross MR, et al. Mechanical properties of sprinting in elite rugby union and rugby sevens. Int J Sports Physiol Perform. 2017.",
        "Jiménez-Reyes P, et al. Sprint force–velocity profiling and individualisation. 2019.",
        "Haugen T, et al. Sprint running mechanics in team sports. 2019.",
        "Slawinski J, et al. World-class sprint performance mechanics. Scand J Med Sci Sports. 2017.",
        "Giroux C, et al. Determining lower-limb force–velocity relationships. 2016.",
      ],
    },
  ],
};

const FR = {
  lang: "fr",
  rtl: false,
  title: "FV PocketLab — Méthode scientifique",
  kicker: "Note à l’attention des entraîneurs, préparateurs physiques et athlètes",
  blocks: [
    {
      type: "h2",
      text: "Profiler la force et la vitesse, pas seulement un temps ou une hauteur",
    },
    {
      type: "p",
      text: "FV PocketLab s’appuie sur le profilage force–vitesse : une méthode de terrain qui permet d’estimer comment un athlète produit de la force sur une gamme de vitesses de mouvement, à partir de quelques tests bien contrôlés, sans séance de laboratoire complète.",
    },
    {
      type: "p",
      text: "Un chronomètre ou un tapis de saut répond à « combien de temps ? » ou « quelle hauteur ? ». Un profil force–vitesse répond au pourquoi de ce résultat : l’athlète est-il davantage limité par la force, par la vitesse, ou par la façon dont il applique la force lorsque la vitesse augmente. L’entraînement peut alors viser la qualité manquante, plutôt qu’un travail de puissance générique.",
    },
    {
      type: "p",
      text: "Les modèles de l’application suivent les travaux de Pierre Samozino et Jean-Benoît Morin, ainsi que les études appliquées de Pedro Jiménez-Reyes, Matt Cross et leurs collègues. La vidéo sur l’appareil sert à mesurer le test. Le cœur scientifique, ce sont ces méthodes de terrain publiées.",
    },
    { type: "h2", text: "Saut vertical — la méthode simple de Samozino" },
    {
      type: "p",
      text: "Le protocole de saut utilise plusieurs sauts verticaux avec charges additionnelles croissantes. L’application propose des charges liées à la masse corporelle. Pour chaque essai, il faut la masse corporelle, la distance de poussée et la hauteur de saut.",
    },
    {
      type: "p",
      text: "À partir de là, l’application reconstitue le profil des membres inférieurs :",
    },
    {
      type: "ul",
      items: [
        "F0 — force maximale théorique",
        "V0 — vitesse maximale théorique",
        "Pmax — puissance mécanique maximale",
        "Pente force–vitesse — comment la force diminue lorsque la vitesse augmente",
        "Déséquilibre force–vitesse — l’écart entre la pente actuelle et la pente qui maximiserait la hauteur de saut à puissance égale",
      ],
    },
    {
      type: "p",
      text: "Cette dernière idée est centrale. Deux athlètes peuvent avoir la même puissance de pointe et sauter différemment si l’un est trop fort et lent, et l’autre trop rapide et « léger ». L’équipe de Samozino a montré que, pour une puissance donnée, il existe un équilibre force–vitesse optimal pour une poussée balistique. L’application classe le profil en déficit de force, déficit de vitesse, ou équilibré, afin que l’orientation de l’entraînement suive l’athlète, et non un modèle unique.",
    },
    { type: "h3", text: "Scientifiques et études (saut)" },
    {
      type: "ul",
      items: [
        "Samozino, Morin, Hintzy, Belli (2008), Journal of Biomechanics — une méthode pratique pour obtenir force, vitesse et puissance en saut à partir de la hauteur, de la masse et de la distance de poussée, sans plaque de force à chaque essai.",
        "Samozino, Rejc, di Prampero, Belli, Morin (2012), Medicine & Science in Sports & Exercise — le profil force–vitesse optimal des mouvements balistiques : maximiser la hauteur à puissance constante.",
        "Samozino, Edouard, Sangnier, Brughelli, Gimenez, Morin (2014) — comment le déséquilibre de ce profil influe sur la performance en saut et l’efficacité mécanique.",
        "Jiménez-Reyes, Samozino, Brughelli, Morin (2017), Frontiers in Physiology — un entraînement individualisé à partir du profil de saut ; le pont entre la théorie de laboratoire et la programmation spécifique au sport. Les cibles par sport de l’application s’appuient sur cette lignée.",
      ],
    },
    { type: "h2", text: "Sprint linéaire — Morin et Samozino" },
    {
      type: "p",
      text: "Le protocole de sprint utilise une course chronométrée (30, 40 ou 60 mètres) avec temps intermédiaires, ou une série position–temps issue de la vidéo. L’application ajuste le modèle d’accélération classique de cette littérature, puis en déduit le profil force–vitesse–puissance horizontal :",
    },
    {
      type: "ul",
      items: [
        "F0, V0 et Pmax — le même langage que pour le saut, appliqué au sprint",
        "RF (ratio de force) — la part de force orientée vers l’avant plutôt que dans le sol",
        "DRF — comment cette orientation horizontale diminue lorsque la vitesse augmente",
      ],
    },
    {
      type: "p",
      text: "La performance en sprint n’est pas seulement la quantité de force, mais sa direction et sa durée dans la course. Un athlète peut être fort sur le papier et accélérer peu si la force n’est pas appliquée horizontalement. Morin et Samozino ont rendu cela lisible pour les entraîneurs : déficit de force, de vitesse, de puissance, ou problème d’orientation.",
    },
    {
      type: "p",
      text: "Les conditions de l’air peuvent être prises en compte afin de ne pas ignorer la résistance aérodynamique. La qualité des temps intermédiaires et la fidélité du modèle à la course sont reportées, pour qu’un test bruité ne soit pas traité comme un profil parfait.",
    },
    { type: "h3", text: "Scientifiques et études (sprint)" },
    {
      type: "ul",
      items: [
        "Samozino, Rabita, Dorel, Slawinski, Peyrot, Saez de Villarreal, Morin (2016), Scandinavian Journal of Medicine & Science in Sports — une méthode simple pour la force, la vitesse et la puissance en sprint à partir des temps intermédiaires.",
        "Morin et Samozino (2016), International Journal of Sports Physiology and Performance — comment interpréter les profils puissance–force–vitesse pour un entraînement individualisé. C’est la référence pour lire F0, V0, Pmax, RF et DRF sur le terrain.",
        "Cross, Brughelli, Brown, Samozino, Gill, Cronin, Morin (2017), International Journal of Sports Physiology and Performance — propriétés mécaniques du sprint chez des rugbymen d’élite (union et sevens) : la méthode en sport collectif de haut niveau.",
        "Jiménez-Reyes et collègues (2019) — individualisation du profil force–vitesse de sprint selon les sports.",
        "Contexte sportif complémentaire : Haugen et collègues (2019) sur la mécanique de sprint en sports collectifs ; Slawinski et collègues (2017) sur la mécanique du 100 mètres d’élite ; Giroux et collègues (2016) sur les méthodes force–vitesse, y compris les sports cycliques.",
      ],
    },
    { type: "h2", text: "Ce que l’application ajoute autour de cette science" },
    {
      type: "ul",
      items: [
        "Le même langage mécanique que les publications et les outils issus de Samozino–Morin : F0, V0, Pmax, pente, déséquilibre, RF, DRF.",
        "Une capture sur l’appareil — la vidéo et la pose aident à mesurer la hauteur de saut et les temps de sprint sur le terrain ; l’analyse est calculée sur l’appareil.",
        "Des cibles orientées sport — zones indicatives agrégées à partir des études ci-dessus. Ce sont des références typiques d’athlètes entraînés, pas des normes médicales.",
        "La qualité du test — dans quelle mesure le profil s’ajuste aux essais ou aux temps intermédiaires, pour une interprétation honnête.",
        "Une lecture orientée entraînement — force, vitesse, puissance mixte, ou orientation en sprint — pas un diagnostic.",
      ],
    },
    { type: "h2", text: "Comment le dire à un athlète, en un paragraphe" },
    {
      type: "p",
      text: "On ne se contente pas de chronométrer un sprint ou de mesurer un saut. On construit une signature mécanique : force maximale, vitesse maximale du système, puissance de pointe, et — en sprint — la capacité à garder la force vers l’avant pendant l’accélération. Cette signature est comparée à un équilibre optimal décrit par l’équipe de Samozino, et à des valeurs typiques par sport issues d’études appliquées indépendantes. L’objectif est une cible d’entraînement plus claire : plus de force, plus de vitesse, ou une meilleure orientation, selon votre profil.",
    },
    {
      type: "p",
      text: "Ces résultats ne constituent pas un diagnostic médical. Ils doivent être lus par un professionnel qualifié, dans le contexte : sport, calendrier, antécédents blessure et modèle technique.",
    },
    { type: "h2", text: "Les noms clés, en une ligne" },
    {
      type: "p",
      text: "Pierre Samozino et Jean-Benoît Morin (méthodes de terrain force–vitesse ; profil optimal ; RF et DRF en sprint). Pedro Jiménez-Reyes (entraînement individualisé en saut et en sprint). Matt Cross et collègues (mécanique de sprint en rugby d’élite). Contexte sportif complémentaire : Haugen, Slawinski, Giroux.",
    },
    { type: "h2", text: "Références sélectionnées" },
    {
      type: "ol",
      items: [
        "Samozino P, Morin J-B, Hintzy F, Belli A. A simple method for measuring force, velocity and power output during squat jump. J Biomech. 2008.",
        "Samozino P, Rejc E, di Prampero PE, Belli A, Morin J-B. Optimal force–velocity profile in ballistic movements. Med Sci Sports Exerc. 2012.",
        "Samozino P, Edouard P, Sangnier S, Brughelli M, Gimenez P, Morin J-B. Force–velocity profile: imbalance and jumping performance. 2014.",
        "Jiménez-Reyes P, Samozino P, Brughelli M, Morin J-B. Effectiveness of an individualized training based on force–velocity profiling during jumping. Front Physiol. 2017.",
        "Samozino P, Rabita G, Dorel S, et al. A simple method for measuring force, velocity and power output during sprint running. Scand J Med Sci Sports. 2016.",
        "Morin J-B, Samozino P. Interpreting power–force–velocity profiles for individualized and specific training. Int J Sports Physiol Perform. 2016.",
        "Cross MR, et al. Mechanical properties of sprinting in elite rugby union and rugby sevens. Int J Sports Physiol Perform. 2017.",
        "Jiménez-Reyes P, et al. Sprint force–velocity profiling and individualisation. 2019.",
        "Haugen T, et al. Sprint running mechanics in team sports. 2019.",
        "Slawinski J, et al. World-class sprint performance mechanics. Scand J Med Sci Sports. 2017.",
        "Giroux C, et al. Determining lower-limb force–velocity relationships. 2016.",
      ],
    },
  ],
};

const AR = {
  lang: "ar",
  rtl: true,
  title: "FV PocketLab — المنهج العلمي",
  kicker: "ملاحظة للمدربين وأخصائيي الإعداد البدني والرياضيين",
  blocks: [
    {
      type: "h2",
      text: "تحليل القوة والسرعة، لا مجرد زمن أو ارتفاع",
    },
    {
      type: "p",
      text: "يُبنى تطبيق FV PocketLab على تحليل ملف القوة–السرعة: منهج ميداني يتيح للمدرب تقدير كيف يُنتج الرياضي القوة عبر مدى من سرعات الحركة، انطلاقًا من اختبارات قليلة مضبوطة، دون جلسة مختبر كاملة.",
    },
    {
      type: "p",
      text: "ساعة الإيقاف أو بساط القفز يجيبان عن «كم السرعة؟» أو «كم الارتفاع؟». أما ملف القوة–السرعة فيجيب عن سبب النتيجة: هل يحدّ الرياضي أكثر نقص القوة، أم نقص السرعة، أم طريقة توجيه القوة كلما ارتفعت السرعة. عندها يمكن توجيه التدريب نحو الصفة الناقصة، بدل عمل قدرة عام.",
    },
    {
      type: "p",
      text: "تتبع نماذج التطبيق أعمال بيير ساموزينو (Pierre Samozino) وجان-بنوا موران (Jean-Benoît Morin)، والدراسات التطبيقية لبيدرو خيمينيز-رييس (Pedro Jiménez-Reyes) ومات كروس (Matt Cross) وزملائهم. يُستخدم الفيديو على الجهاز لقياس الاختبار. أما الجوهر العلمي فهو تلك المناهج الميدانية المنشورة.",
    },
    { type: "h2", text: "القفز العمودي — منهج ساموزينو المبسط" },
    {
      type: "p",
      text: "يعتمد بروتوكول القفز على عدة قفزات عمودية بأحمال إضافية متزايدة. يقترح التطبيق أحمالًا مرتبطة بكتلة الجسم. لكل محاولة يلزم: كتلة الجسم، ومسافة الدفع، وارتفاع القفز.",
    },
    {
      type: "p",
      text: "ومن ذلك يُعاد بناء ملف الأطراف السفلية للرياضي:",
    },
    {
      type: "ul",
      items: [
        "F0 — القوة القصوى النظرية",
        "V0 — السرعة القصوى النظرية",
        "Pmax — القدرة الميكانيكية القصوى",
        "ميل القوة–السرعة — كيف تنخفض القوة مع ارتفاع السرعة",
        "اختلال توازن القوة–السرعة — مدى ابتعاد الميل الحالي عن الميل الذي يعظّم ارتفاع القفز عند القدرة نفسها",
      ],
    },
    {
      type: "p",
      text: "هذه الفكرة الأخيرة محورية. قد يشترك رياضيان في ذروة القدرة نفسها ويقفزان بشكل مختلف إذا كان أحدهما أقوى وأبطأ والآخر أسرع وأخف. بيّن فريق ساموزينو أنه، عند قدرة معيّنة، يوجد توازن أمثل بين القوة والسرعة للدفع الباليستي. يصنّف التطبيق الملف إلى عجز في القوة، أو عجز في السرعة، أو متوازن، حتى يتبع اتجاه التدريب الرياضي لا قالبًا واحدًا.",
    },
    { type: "h3", text: "العلماء والدراسات (القفز)" },
    {
      type: "ul",
      items: [
        "ساموزينو، موران، هينتزي، بيلي (2008)، Journal of Biomechanics — منهج عملي لاستخراج القوة والسرعة والقدرة أثناء القفز من الارتفاع والكتلة ومسافة الدفع، دون لوحة قوة في كل محاولة.",
        "ساموزينو، ريجك، دي برامبيرو، بيلي، موران (2012)، Medicine & Science in Sports & Exercise — ملف القوة–السرعة الأمثل للحركات الباليستية: تعظيم ارتفاع القفز عند قدرة ثابتة.",
        "ساموزينو، إدوارد، سانينييه، بروغيلي، خيمينيز، موران (2014) — كيف يؤثر اختلال هذا الملف على أداء القفز والفعالية الميكانيكية.",
        "خيمينيز-رييس، ساموزينو، بروغيلي، موران (2017)، Frontiers in Physiology — تدريب فردي انطلاقًا من ملف قفز القوة–السرعة؛ الجسر من نظرية المختبر إلى البرمجة الخاصة بالرياضة. وتستند أهداف الرياضات في التطبيق إلى هذا الخط البحثي.",
      ],
    },
    { type: "h2", text: "العدو الخطي — موران وساموزينو" },
    {
      type: "p",
      text: "يستخدم بروتوكول العدو جريًا موقوتًا (30 أو 40 أو 60 مترًا) بأزمنة جزئية، أو سلسلة موضع–زمن من الفيديو. يوائم التطبيق نموذج التسارع الكلاسيكي في هذه الأدبيات، ثم يستخرج ملف القوة–السرعة–القدرة الأفقي:",
    },
    {
      type: "ul",
      items: [
        "F0 وV0 وPmax — اللغة نفسها المستخدمة في القفز، مطبّقة على العدو",
        "RF (نسبة القوة) — نصيب القوة الموجّهة إلى الأمام مقابل القوة الموجّهة إلى الأرض",
        "DRF — كيف يتراجع هذا التوجيه الأفقي مع ارتفاع السرعة",
      ],
    },
    {
      type: "p",
      text: "أداء العدو ليس مقدار القوة فحسب، بل اتجاهها واستمرارها خلال الجري. قد يكون الرياضي قويًا على الورق ويُسرّع ضعيفًا إذا لم تُطبَّق القوة أفقيًا. جعل موران وساموزينو ذلك مقروءًا للمدربين: عجز قوة، أو عجز سرعة، أو عجز قدرة، أو مشكلة توجيه.",
    },
    {
      type: "p",
      text: "يمكن أخذ ظروف الهواء في الحسبان حتى لا يُتجاهل مقاومة الهواء. وتُعرض جودة الأزمنة الجزئية ومدى ملاءمة النموذج للجري، فلا يُعامل اختبار مضطرب كملف مثالي.",
    },
    { type: "h3", text: "العلماء والدراسات (العدو)" },
    {
      type: "ul",
      items: [
        "ساموزينو، رابيتا، دوريل، سلافينسكي، بيرو، سايز دي فياريل، موران (2016)، Scandinavian Journal of Medicine & Science in Sports — منهج مبسط للقوة والسرعة والقدرة أثناء العدو انطلاقًا من الأزمنة الجزئية.",
        "موران وساموزينو (2016)، International Journal of Sports Physiology and Performance — كيف تُفسَّر ملفات القدرة–القوة–السرعة لتدريب فردي. هذا هو المرجع لقراءة F0 وV0 وPmax وRF وDRF في الميدان.",
        "كروس، بروغيلي، براون، ساموزينو، غيل، كرونين، موران (2017)، International Journal of Sports Physiology and Performance — الخصائص الميكانيكية للعدو لدى نخبة الرغبي (الاتحاد والسباعيات): المنهج في رياضة جماعية عالية المستوى.",
        "خيمينيز-رييس وزملاؤه (2019) — تفريد ملف القوة–السرعة للعدو عبر الرياضات.",
        "سياق رياضي داعم: هوغن وزملاؤه (2019) حول ميكانيكا العدو في الرياضات الجماعية؛ سلافينسكي وزملاؤه (2017) حول ميكانيكا 100 متر للنخبة؛ جيرو وزملاؤه (2016) حول مناهج القوة–السرعة، بما فيها الرياضات الدورية.",
      ],
    },
    { type: "h2", text: "ماذا يضيف التطبيق حول هذا العلم" },
    {
      type: "ul",
      items: [
        "اللغة الميكانيكية نفسها التي يلتقيها المدربون في الأوراق والأدوات المستمدة من ساموزينو–موران: F0 وV0 وPmax والميل والاختلال وRF وDRF.",
        "التقاط على الجهاز — يساعد الفيديو وتتبع الوضعية على قياس ارتفاع القفز وأزمنة العدو في الميدان؛ ويُحسب التحليل على الجهاز.",
        "أهداف موجهة حسب الرياضة — نطاقات إرشادية مجمّعة من الدراسات أعلاه. إنها مراجع نمطية لرياضيين مدرَّبين، وليست معايير طبية.",
        "جودة الاختبار — مدى ملاءمة الملف للمحاولات أو الأزمنة الجزئية، حتى يبقى التفسير نزيهًا.",
        "قراءة موجّهة للتدريب — قوة أو سرعة أو قدرة مختلطة أو توجيه في العدو — وليس تشخيصًا.",
      ],
    },
    { type: "h2", text: "كيف تُقال الجملة للرياضي، في فقرة واحدة" },
    {
      type: "p",
      text: "لسنا نوقّت عدوًا أو نقيس قفزًا فحسب. نحن نبني توقيعًا ميكانيكيًا: القوة القصوى، والسرعة القصوى للمنظومة، وذروة القدرة، وفي العدو مدى بقاء القوة إلى الأمام أثناء التسارع. يُقارَن هذا التوقيع بتوازن أمثل وصفه فريق ساموزينو، وبقيم نمطية حسب الرياضة من دراسات تطبيقية مستقلة. الهدف هدف تدريبي أوضح: مزيد من القوة، أو مزيد من السرعة، أو توجيه أفضل، بحسب ملفك.",
    },
    {
      type: "p",
      text: "هذه النتائج ليست تشخيصًا طبيًا. ينبغي أن يقرأها مختص مؤهل، في سياق الرياضة والروزنامة وتاريخ الإصابات والنموذج التقني.",
    },
    { type: "h2", text: "الأسماء الأساسية، في سطر واحد" },
    {
      type: "p",
      text: "بيير ساموزينو وجان-بنوا موران (مناهج ميدانية للقوة–السرعة؛ الملف الأمثل؛ RF وDRF في العدو). بيدرو خيمينيز-رييس (تدريب فردي للقفز والعدو). مات كروس وزملاؤه (ميكانيكا العدو في رغبي النخبة). سياق رياضي إضافي: هوغن، سلافينسكي، جيرو.",
    },
    { type: "h2", text: "مراجع مختارة" },
    {
      type: "ol",
      items: [
        "Samozino P, Morin J-B, Hintzy F, Belli A. A simple method for measuring force, velocity and power output during squat jump. J Biomech. 2008.",
        "Samozino P, Rejc E, di Prampero PE, Belli A, Morin J-B. Optimal force–velocity profile in ballistic movements. Med Sci Sports Exerc. 2012.",
        "Samozino P, Edouard P, Sangnier S, Brughelli M, Gimenez P, Morin J-B. Force–velocity profile: imbalance and jumping performance. 2014.",
        "Jiménez-Reyes P, Samozino P, Brughelli M, Morin J-B. Effectiveness of an individualized training based on force–velocity profiling during jumping. Front Physiol. 2017.",
        "Samozino P, Rabita G, Dorel S, et al. A simple method for measuring force, velocity and power output during sprint running. Scand J Med Sci Sports. 2016.",
        "Morin J-B, Samozino P. Interpreting power–force–velocity profiles for individualized and specific training. Int J Sports Physiol Perform. 2016.",
        "Cross MR, et al. Mechanical properties of sprinting in elite rugby union and rugby sevens. Int J Sports Physiol Perform. 2017.",
        "Jiménez-Reyes P, et al. Sprint force–velocity profiling and individualisation. 2019.",
        "Haugen T, et al. Sprint running mechanics in team sports. 2019.",
        "Slawinski J, et al. World-class sprint performance mechanics. Scand J Med Sci Sports. 2017.",
        "Giroux C, et al. Determining lower-limb force–velocity relationships. 2016.",
      ],
    },
  ],
};

function run(text, { rtl = false, bold = false, size = 22, color = INK, italics = false } = {}) {
  return new TextRun({
    text,
    bold,
    italics,
    size,
    font: FONT,
    color,
    rightToLeft: rtl,
  });
}

function para(text, { rtl = false, bold = false, italics = false, size = 22, color = INK, after = 200, before = 0, align } = {}) {
  return new Paragraph({
    bidirectional: rtl,
    alignment: align ?? (rtl ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED),
    spacing: { after, before, line: 276 },
    children: [run(text, { rtl, bold, italics, size, color })],
  });
}

function langSection(data, { pageBreak = false } = {}) {
  const rtl = data.rtl;
  const out = [];

  out.push(
    para(data.title, {
      rtl,
      bold: true,
      size: 40,
      color: BLUE,
      after: 80,
      before: pageBreak ? 0 : 0,
      align: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    }),
  );
  if (pageBreak) {
    out[0] = new Paragraph({
      pageBreakBefore: true,
      bidirectional: rtl,
      alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      spacing: { after: 80, line: 276 },
      children: [run(data.title, { rtl, bold: true, size: 40, color: BLUE })],
    });
  }

  out.push(
    para(data.kicker, {
      rtl,
      italics: true,
      size: 22,
      color: MUTED,
      after: 360,
      align: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
    }),
  );

  for (const block of data.blocks) {
    if (block.type === "h2") {
      out.push(
        para(block.text, {
          rtl,
          bold: true,
          size: 28,
          color: BLUE,
          before: 280,
          after: 140,
          align: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        }),
      );
    } else if (block.type === "h3") {
      out.push(
        para(block.text, {
          rtl,
          bold: true,
          size: 24,
          color: INK,
          before: 200,
          after: 120,
          align: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        }),
      );
    } else if (block.type === "p") {
      out.push(para(block.text, { rtl, after: 200 }));
    } else if (block.type === "ul" || block.type === "ol") {
      block.items.forEach((item, i) => {
        const mark = block.type === "ol" ? `${i + 1}. ` : "• ";
        out.push(
          para(mark + item, {
            rtl,
            after: 80,
            align: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
          }),
        );
      });
    }
  }

  return out;
}

const children = [
  para("FV PocketLab", {
    bold: true,
    size: 48,
    color: BLUE,
    after: 60,
    align: AlignmentType.CENTER,
  }),
  para("Scientific method  ·  Méthode scientifique  ·  المنهج العلمي", {
    size: 22,
    color: MUTED,
    after: 80,
    align: AlignmentType.CENTER,
  }),
  para("English  ·  Français  ·  العربية", {
    size: 20,
    color: MUTED,
    after: 400,
    align: AlignmentType.CENTER,
  }),
  ...langSection(EN),
  ...langSection(FR, { pageBreak: true }),
  ...langSection(AR, { pageBreak: true }),
];

const doc = new Document({
  creator: "FV PocketLab",
  title: "FV PocketLab — Scientific method / Méthode scientifique / المنهج العلمي",
  description: "User-facing scientific method note in English, French and Arabic.",
  styles: {
    default: {
      document: {
        run: { font: FONT, size: 22 },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 900, bottom: 900, left: 1080, right: 1080 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [run("FV PocketLab  ·  Method & references", { size: 18, color: MUTED })],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                run("© FV PocketLab  ·  ", { size: 16, color: MUTED }),
                run("These results are not a medical diagnosis.  ·  Ces résultats ne constituent pas un diagnostic médical.  ·  هذه النتائج ليست تشخيصًا طبيًا.", {
                  size: 16,
                  color: MUTED,
                }),
                run("   ", { size: 16 }),
                new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "docs");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "FV-PocketLab-methode-scientifique.docx");

const buffer = await Packer.toBuffer(doc);
writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath}`);
