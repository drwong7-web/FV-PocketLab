import type { Lang } from "@/lib/settings";

export type MethodBlock =
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "note"; text: string }
  | { type: "ul"; items: string[] };

export type MethodNote = {
  rtl: boolean;
  title: string;
  kicker: string;
  disclaimer: string;
  blocks: MethodBlock[];
};

const EN: MethodNote = {
  rtl: false,
  title: "FV PocketLab — Scientific method",
  kicker: "A one-page note for coaches, S&C staff and athletes",
  disclaimer: "These results are not a medical diagnosis.",
  blocks: [
    { type: "h2", text: "What the app profiles" },
    {
      type: "p",
      text: "FV PocketLab does not only record a time or a jump height. It builds a force–velocity profile: whether the athlete is limited more by force, by velocity, or by how force is applied as speed rises. Video on the device measures the test. The scientific core is the published field methods of Pierre Samozino and Jean-Benoît Morin.",
    },
    { type: "h2", text: "Vertical jump — Samozino" },
    {
      type: "p",
      text: "Several vertical jumps with increasing load. From body mass, push-off distance and jump height the app reconstructs:",
    },
    {
      type: "ul",
      items: [
        "F0 — theoretical maximal force",
        "V0 — theoretical maximal velocity",
        "Pmax — maximal mechanical power",
        "Slope and imbalance versus the optimal balance at the same power (force-deficient, velocity-deficient, or balanced)",
      ],
    },
    {
      type: "p",
      text: "Two athletes can share the same peak power and still jump differently. Samozino’s group showed that, for a given power, there is an optimal force–velocity balance for ballistic push-off. Training can follow the athlete, not a template.",
    },
    {
      type: "note",
      text: "Studies: Samozino, Morin, Hintzy, Belli (2008). Optimal profile: Samozino et al. (2012, 2014). Sport-specific training: Jiménez-Reyes et al. (2017).",
    },
    { type: "h2", text: "Linear sprint — Morin and Samozino" },
    {
      type: "p",
      text: "A 30, 40 or 60 m timed run with splits. The app derives a horizontal profile:",
    },
    {
      type: "ul",
      items: [
        "F0, V0 and Pmax — the same language as the jump, applied to sprinting",
        "RF — share of force directed forward rather than into the ground",
        "DRF — how that forward orientation declines as speed rises",
      ],
    },
    {
      type: "p",
      text: "Sprint performance is not only how much force, but in which direction and for how long into the run. Coaches can read a force, velocity, power or orientation deficit.",
    },
    {
      type: "note",
      text: "Studies: Samozino et al. (2016); Morin & Samozino (2016); Cross et al. (2017); Jiménez-Reyes et al. (2019).",
    },
    { type: "h2", text: "Target profile by sport" },
    {
      type: "p",
      text: "The measured profile is then compared with a sport-specific target zone — typical F0, V0 and Pmax for trained athletes in that sport. These zones are aggregated from published applied studies. They are indicative medians, not medical norms and not a diagnosis.",
    },
    {
      type: "note",
      text: "Target-profile studies: Jiménez-Reyes et al. (2017, 2019) — individualisation by sport; Cross et al. (2017) — elite rugby; Morin & Samozino (2016) — how to read P–F–V profiles; Samozino et al. (2016) — sprint mechanics; Haugen et al. (2019) — team-sport sprinting; Slawinski et al. (2017) — elite sprinters; Giroux et al. (2016) — force–velocity methods, including track cycling.",
    },
    { type: "h2", text: "What PocketLab adds" },
    {
      type: "ul",
      items: [
        "The same mechanical language as the papers (F0, V0, Pmax, slope, imbalance, RF, DRF)",
        "Capture and analysis on the device",
        "A quality check, so a noisy test is not treated as a perfect profile",
      ],
    },
    { type: "h2", text: "In one sentence" },
    {
      type: "p",
      text: "You are building a mechanical signature — force, speed, power, and in sprint how well force stays forward — compared with an optimal balance and with sport-typical values, so the training target is yours.",
    },
  ],
};

const FR: MethodNote = {
  rtl: false,
  title: "FV PocketLab — Méthode scientifique",
  kicker: "Note d'une page pour les entraîneurs, préparateurs physiques et athlètes",
  disclaimer: "Ces résultats ne constituent pas un diagnostic médical.",
  blocks: [
    { type: "h2", text: "Ce que l'application profile" },
    {
      type: "p",
      text: "FV PocketLab ne se contente pas d'enregistrer un temps ou une hauteur de saut. Il construit un profil force–vitesse : l'athlète est-il davantage limité par la force, par la vitesse, ou par la façon d'appliquer la force lorsque la vitesse augmente. La vidéo sur l'appareil mesure le test. Le cœur scientifique, ce sont les méthodes de terrain publiées de Pierre Samozino et Jean-Benoît Morin.",
    },
    { type: "h2", text: "Saut vertical — Samozino" },
    {
      type: "p",
      text: "Plusieurs sauts verticaux à charges croissantes. À partir de la masse corporelle, de la distance de poussée et de la hauteur, l'application reconstitue :",
    },
    {
      type: "ul",
      items: [
        "F0 — force maximale théorique",
        "V0 — vitesse maximale théorique",
        "Pmax — puissance mécanique maximale",
        "Pente et déséquilibre par rapport à l'équilibre optimal à puissance égale (déficit de force, déficit de vitesse, ou profil équilibré)",
      ],
    },
    {
      type: "p",
      text: "Deux athlètes peuvent avoir la même puissance de pointe et sauter différemment. L'équipe de Samozino a montré que, pour une puissance donnée, il existe un équilibre force–vitesse optimal pour une poussée balistique. L'entraînement peut suivre l'athlète, pas un modèle unique.",
    },
    {
      type: "note",
      text: "Études : Samozino, Morin, Hintzy, Belli (2008). Profil optimal : Samozino et al. (2012, 2014). Entraînement spécifique au sport : Jiménez-Reyes et al. (2017).",
    },
    { type: "h2", text: "Sprint linéaire — Morin et Samozino" },
    {
      type: "p",
      text: "Une course chronométrée de 30, 40 ou 60 m avec temps intermédiaires. L'application en déduit un profil horizontal :",
    },
    {
      type: "ul",
      items: [
        "F0, V0 et Pmax — le même langage que pour le saut, appliqué au sprint",
        "RF — part de force orientée vers l'avant plutôt que dans le sol",
        "DRF — comment cette orientation vers l'avant diminue lorsque la vitesse augmente",
      ],
    },
    {
      type: "p",
      text: "La performance en sprint n'est pas seulement la quantité de force, mais sa direction et sa durée dans la course. L'entraîneur peut lire un déficit de force, de vitesse, de puissance ou d'orientation.",
    },
    {
      type: "note",
      text: "Études : Samozino et al. (2016) ; Morin et Samozino (2016) ; Cross et al. (2017) ; Jiménez-Reyes et al. (2019).",
    },
    { type: "h2", text: "Profil cible par sport" },
    {
      type: "p",
      text: "Le profil mesuré est ensuite comparé à une zone cible spécifique au sport — F0, V0 et Pmax typiques d'athlètes entraînés dans cette discipline. Ces zones sont agrégées à partir d'études appliquées publiées. Ce sont des médianes indicatives, pas des normes médicales et pas un diagnostic.",
    },
    {
      type: "note",
      text: "Études du profil cible : Jiménez-Reyes et al. (2017, 2019) — individualisation par sport ; Cross et al. (2017) — rugby d'élite ; Morin et Samozino (2016) — lecture des profils P–F–V ; Samozino et al. (2016) — mécanique de sprint ; Haugen et al. (2019) — sprint en sports collectifs ; Slawinski et al. (2017) — sprinters d'élite ; Giroux et al. (2016) — méthodes force–vitesse, dont le cyclisme sur piste.",
    },
    { type: "h2", text: "Ce que PocketLab ajoute" },
    {
      type: "ul",
      items: [
        "Le même langage mécanique que les publications (F0, V0, Pmax, pente, déséquilibre, RF, DRF)",
        "Capture et analyse sur l'appareil",
        "Un contrôle de qualité, pour qu'un test bruité ne soit pas traité comme un profil parfait",
      ],
    },
    { type: "h2", text: "En une phrase" },
    {
      type: "p",
      text: "On construit une signature mécanique — force, vitesse, puissance, et en sprint la capacité à garder la force vers l'avant — comparée à un équilibre optimal et à des valeurs typiques par sport, pour que la cible d'entraînement soit la vôtre.",
    },
  ],
};

const AR: MethodNote = {
  rtl: true,
  title: "FV PocketLab — المنهج العلمي",
  kicker: "ورقة من صفحة واحدة للمدربين وأخصائيي الإعداد البدني والرياضيين",
  disclaimer: "هذه النتائج ليست تشخيصًا طبيًا.",
  blocks: [
    { type: "h2", text: "ماذا يحلّل التطبيق" },
    {
      type: "p",
      text: "لا يقتصر FV PocketLab على تسجيل زمن أو ارتفاع قفز. إنه يبني ملف قوة–سرعة: هل يحدّ الرياضي أكثر نقص القوة، أم نقص السرعة، أم طريقة توجيه القوة كلما ارتفعت السرعة. يقيس الفيديو على الجهاز الاختبار. أما الجوهر العلمي فهو مناهج الميدان المنشورة لبيير ساموزينو وجان-بنوا موران.",
    },
    { type: "h2", text: "القفز العمودي — ساموزينو" },
    {
      type: "p",
      text: "عدة قفزات عمودية بأحمال متزايدة. من كتلة الجسم ومسافة الدفع وارتفاع القفز يعيد التطبيق بناء:",
    },
    {
      type: "ul",
      items: [
        "F0 — القوة القصوى النظرية",
        "V0 — السرعة القصوى النظرية",
        "Pmax — القدرة الميكانيكية القصوى",
        "الميل والاختلال مقابل التوازن الأمثل عند القدرة نفسها (عجز قوة، أو عجز سرعة، أو ملف متوازن)",
      ],
    },
    {
      type: "p",
      text: "قد يشترك رياضيان في ذروة القدرة نفسها ويقفزان بشكل مختلف. بيّن فريق ساموزينو أنه عند قدرة معيّنة يوجد توازن أمثل بين القوة والسرعة للدفع الباليستي. يمكن أن يتبع التدريب الرياضي لا قالبًا واحدًا.",
    },
    {
      type: "note",
      text: "دراسات: ساموزينو، موران، هينتزي، بيلي (2008). الملف الأمثل: ساموزينو وآخرون (2012، 2014). التدريب الخاص بالرياضة: خيمينيز-رييس وآخرون (2017).",
    },
    { type: "h2", text: "العدو الخطي — موران وساموزينو" },
    {
      type: "p",
      text: "جري موقوت 30 أو 40 أو 60 مترًا بأزمنة جزئية. يستخرج التطبيق ملفًا أفقيًا:",
    },
    {
      type: "ul",
      items: [
        "F0 وV0 وPmax — اللغة نفسها المستخدمة في القفز، مطبّقة على العدو",
        "RF — نصيب القوة الموجّهة إلى الأمام لا إلى الأرض",
        "DRF — كيف يتراجع هذا التوجيه الأمامي مع ارتفاع السرعة",
      ],
    },
    {
      type: "p",
      text: "أداء العدو ليس مقدار القوة فحسب، بل اتجاهها واستمرارها خلال الجري. يمكن للمدرب قراءة عجز في القوة أو السرعة أو القدرة أو التوجيه.",
    },
    {
      type: "note",
      text: "دراسات: ساموزينو وآخرون (2016)؛ موران وساموزينو (2016)؛ كروس وآخرون (2017)؛ خيمينيز-رييس وآخرون (2019).",
    },
    { type: "h2", text: "الملف المستهدف حسب الرياضة" },
    {
      type: "p",
      text: "يُقارَن الملف المقاس بنطاق مستهدف خاص بالرياضة — قيم نمطية لـ F0 وV0 وPmax لدى رياضيين مدرَّبين في تلك اللعبة. تُجمَّع هذه النطاقات من دراسات تطبيقية منشورة. إنها متوسطات إرشادية، وليست معايير طبية ولا تشخيصًا.",
    },
    {
      type: "note",
      text: "دراسات الملف المستهدف: خيمينيز-رييس وآخرون (2017، 2019) — التفريد حسب الرياضة؛ كروس وآخرون (2017) — رغبي النخبة؛ موران وساموزينو (2016) — قراءة ملفات القدرة–القوة–السرعة؛ ساموزينو وآخرون (2016) — ميكانيكا العدو؛ هوغن وآخرون (2019) — العدو في الرياضات الجماعية؛ سلافينسكي وآخرون (2017) — عدّاؤو النخبة؛ جيرو وآخرون (2016) — مناهج القوة–السرعة ومنها سباق الدراجات على المضمار.",
    },
    { type: "h2", text: "ماذا يضيف PocketLab" },
    {
      type: "ul",
      items: [
        "اللغة الميكانيكية نفسها الواردة في الدراسات (F0 وV0 وPmax والميل والاختلال وRF وDRF)",
        "التقاط وتحليل على الجهاز",
        "فحص للجودة حتى لا يُعامل اختبار مضطرب كملف مثالي",
      ],
    },
    { type: "h2", text: "في جملة واحدة" },
    {
      type: "p",
      text: "أنت تبني توقيعًا ميكانيكيًا — قوة وسرعة وقدرة، وفي العدو مدى بقاء القوة إلى الأمام — مقارنةً بتوازن أمثل وبقيم نمطية حسب الرياضة، حتى يكون هدف التدريب هدفك أنت.",
    },
  ],
};

const NOTES: Record<Lang, MethodNote> = { en: EN, fr: FR, ar: AR };

export function getMethodNote(lang: Lang): MethodNote {
  return NOTES[lang] ?? EN;
}
