import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SupportedLanguage = 'en' | 'ar' | 'fr' | 'es' | 'de' | 'zh' | 'ja';

export interface LanguageMeta {
  code: SupportedLanguage;
  nativeLabel: string;
  shortCode: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', nativeLabel: 'English', shortCode: 'EN', dir: 'ltr' },
  { code: 'ar', nativeLabel: 'العربية', shortCode: 'AR', dir: 'rtl' },
  { code: 'fr', nativeLabel: 'Français', shortCode: 'FR', dir: 'ltr' },
  { code: 'es', nativeLabel: 'Español', shortCode: 'ES', dir: 'ltr' },
  { code: 'de', nativeLabel: 'Deutsch', shortCode: 'DE', dir: 'ltr' },
  { code: 'zh', nativeLabel: '中文', shortCode: 'ZH', dir: 'ltr' },
  { code: 'ja', nativeLabel: '日本語', shortCode: 'JA', dir: 'ltr' },
];

export interface TranslationDictionary {
  brand: string;
  voicePromptPlaceholder: string;
  voiceButtonIdle: string;
  voiceButtonListening: string;
  sendButton: string;
  openStudio: string;
  closeStudio: string;
  desktop3D: string;
  desktopBrowser: string;
  desktopMasterPlan: string;
  desktopWorkspace: string;
  machineModeOff: string;
  machineModeOn: string;
  machineModeTooltip: string;
  swarmHudTitle: string;
  swarmHudSubtitle: string;
  tabAgents: string;
  tabMasterPlan: string;
  tabLiveWeb: string;
  tabComms: string;
  tabTools: string;
  statusReportBtn: string;
  newProjectPlaceholder: string;
  executeBtn: string;
  executingBtn: string;
  masterPlanTitle: string;
  masterPlanCloudSynced: string;
  masterPlanExtractedValues: string;
  masterPlanNoActive: string;
  liveWebUrlPlaceholder: string;
  liveWebNavigateBtn: string;
  liveWebScrollUp: string;
  liveWebScrollDown: string;
  liveWebAutoFill: string;
  blockerTitle: string;
  blockerSubtitle: string;
  blockerApproveMachineMode: string;
  blockerCompleteLogin: string;
  blockerDismiss: string;
  stateIdle: string;
  statePlanning: string;
  stateResearching: string;
  stateCoding: string;
  stateTesting: string;
  stateHealing: string;
  stateCompleted: string;
  selfToolsTitle: string;
  selfToolNamePlaceholder: string;
  selfToolDescPlaceholder: string;
  selfToolBuildBtn: string;
  googleSearchActive: string;
  voiceControlHint: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    brand: 'HEYUKA',
    voicePromptPlaceholder: 'Speak or type any goal, project, or web command... (Alt+Space for Voice)',
    voiceButtonIdle: 'Voice',
    voiceButtonListening: 'Listening',
    sendButton: 'Execute',
    openStudio: 'Studio',
    closeStudio: 'Close',
    desktop3D: 'D1 · 3D Core',
    desktopBrowser: 'D2 · Live Web',
    desktopMasterPlan: 'D3 · Master Plan',
    desktopWorkspace: 'D4 · Code & Cloud',
    machineModeOff: 'Standard Mode',
    machineModeOn: 'Machine Mode: ON',
    machineModeTooltip: 'Full Autonomous Execution Machine: Auto-heals technical blockers and executes end-to-end',
    swarmHudTitle: 'Autonomous Swarm Operations',
    swarmHudSubtitle: '5 Smart Cursors · Google Search + AI Code · Multi-Desktop',
    tabAgents: '5 Cursors',
    tabMasterPlan: 'Master Plan',
    tabLiveWeb: 'Live Browser',
    tabComms: 'Comms',
    tabTools: 'Self-Tools',
    statusReportBtn: 'Status Report',
    newProjectPlaceholder: 'Describe any project or task to execute end-to-end...',
    executeBtn: 'Launch',
    executingBtn: 'Running...',
    masterPlanTitle: 'Project Master Plan & Cloud Sync',
    masterPlanCloudSynced: 'Cloud Synced',
    masterPlanExtractedValues: 'Real Extracted Values & Grounded Sources',
    masterPlanNoActive: 'Speak or enter any project goal to generate a live Master Plan.',
    liveWebUrlPlaceholder: 'Enter URL or search query to open & control...',
    liveWebNavigateBtn: 'Open Page',
    liveWebScrollUp: 'Scroll Up',
    liveWebScrollDown: 'Scroll Down',
    liveWebAutoFill: 'Agent Act',
    blockerTitle: 'Human Action or Credential Step Required',
    blockerSubtitle: 'An agent reached an authentication or confirmation step in the Master Plan.',
    blockerApproveMachineMode: 'Grant Full Autonomy (Machine Mode)',
    blockerCompleteLogin: 'Complete Step & Continue',
    blockerDismiss: 'Dismiss',
    stateIdle: 'Ready',
    statePlanning: 'Planning',
    stateResearching: 'Searching',
    stateCoding: 'Coding',
    stateTesting: 'OS Exec',
    stateHealing: 'Self-Heal',
    stateCompleted: 'Done 100%',
    selfToolsTitle: 'Autonomous Self-Tooling Factory',
    selfToolNamePlaceholder: 'Tool Name (e.g., cloud_scraper)',
    selfToolDescPlaceholder: 'Tool task description for Unified Brain...',
    selfToolBuildBtn: 'Build & Merge Tool',
    googleSearchActive: 'Google Search + Open Web + AI Code Grounding',
    voiceControlHint: '100% Voice-Controlled: Say "Open Master Plan", "Switch to Desktop 2", "Status Report", or "Machine Mode"',
  },
  ar: {
    brand: 'HEYUKA',
    voicePromptPlaceholder: 'تحدث أو اكتب أي مشروع أو أمر... (Alt+Space للتحدث الصوتي المباشر)',
    voiceButtonIdle: 'تحدث',
    voiceButtonListening: 'يستمع...',
    sendButton: 'تنفيذ',
    openStudio: 'الاستوديو',
    closeStudio: 'إغلاق',
    desktop3D: 'ديسكتوب 1 · المجسم',
    desktopBrowser: 'ديسكتوب 2 · المتصفح',
    desktopMasterPlan: 'ديسكتوب 3 · الماستر بلان',
    desktopWorkspace: 'ديسكتوب 4 · الكود والسحابة',
    machineModeOff: 'الوضع العادي',
    machineModeOn: 'ماكينة تنفيذ: مفعل',
    machineModeTooltip: 'تفويض كامل كآلة تنفيذ: إصلاح ذاتي لأي عرقلة تقنية وتنفيذ مستمر للنهاية',
    swarmHudTitle: 'منظومة الوكلاء والمؤشرات الذكية',
    swarmHudSubtitle: '5 ماوسات ذكية · بحث Google ومصادر حية · ديسكتوبات متعددة',
    tabAgents: 'الماوسات الـ 5',
    tabMasterPlan: 'الماستر بلان',
    tabLiveWeb: 'المتصفح الحي',
    tabComms: 'الحوار الحي',
    tabTools: 'بناء الأدوات',
    statusReportBtn: 'فين وصلو؟',
    newProjectPlaceholder: 'اطلب أي مشروع أو مهمة ليتم تنفيذها بالكامل...',
    executeBtn: 'انطلاق',
    executingBtn: 'جاري التنفيذ...',
    masterPlanTitle: 'الخطة الرئيسية للمشروع (Master Plan) والتخزين السحابي',
    masterPlanCloudSynced: 'محفوظ سحابياً',
    masterPlanExtractedValues: 'القيم الحقيقية المستخرجة والمصادر الموثقة',
    masterPlanNoActive: 'تحدث أو اكتب أي مشروع لتوليد وعرض الماستر بلان تلقائياً.',
    liveWebUrlPlaceholder: 'أدخل رابط صفحة أو بحث لفتحه والتحكم به...',
    liveWebNavigateBtn: 'عرض الصفحة',
    liveWebScrollUp: 'تحريك لأعلى',
    liveWebScrollDown: 'تحريك لأسفل',
    liveWebAutoFill: 'تنفيذ الوكيل',
    blockerTitle: 'مطلوب خطوة تسجيل دخول أو تفويض منك',
    blockerSubtitle: 'وصل الوكيل إلى صفحة تتطلب تسجيل دخول أو تأكيد ضمن خطة المشروع.',
    blockerApproveMachineMode: 'منح تفويض كامل (ماكينة تنفيذ)',
    blockerCompleteLogin: 'إتمام الخطوة والمتابعة',
    blockerDismiss: 'إغلاق',
    stateIdle: 'جاهز',
    statePlanning: 'يخطط',
    stateResearching: 'يبحث',
    stateCoding: 'يبرمج',
    stateTesting: 'ينفذ بالنظام',
    stateHealing: 'يصلح ذاتياً',
    stateCompleted: 'مكتمل 100%',
    selfToolsTitle: 'مصنع الأدوات الذاتية في العقل الموحد',
    selfToolNamePlaceholder: 'اسم الأداة (مثال: web_extractor)',
    selfToolDescPlaceholder: 'وصف مهمة الأداة لدمجها في العقل الموحد...',
    selfToolBuildBtn: 'بناء ودمج الأداة',
    googleSearchActive: 'متصل بـ Google Search والمصادر المفتوحة وتوليد الأكواد',
    voiceControlHint: 'تحكم صوتي كامل: قل "وريني الماستر بلان"، "افتح ديسكتوب 2"، "فين وصلو؟"، أو "فعل ماكينة التنفيذ"',
  },
  fr: {
    brand: 'HEYUKA',
    voicePromptPlaceholder: 'Parlez ou tapez un projet ou une commande vocale... (Alt+Espace)',
    voiceButtonIdle: 'Voix',
    voiceButtonListening: 'Écoute...',
    sendButton: 'Exécuter',
    openStudio: 'Studio',
    closeStudio: 'Fermer',
    desktop3D: 'B1 · Cœur 3D',
    desktopBrowser: 'B2 · Web Direct',
    desktopMasterPlan: 'B3 · Master Plan',
    desktopWorkspace: 'B4 · Code & Cloud',
    machineModeOff: 'Mode Standard',
    machineModeOn: 'Mode Machine : ON',
    machineModeTooltip: 'Exécution autonome totale et auto-réparation technique',
    swarmHudTitle: 'Essaim Autonome & 5 Curseurs',
    swarmHudSubtitle: '5 Curseurs · Google Search & Code IA · Multi-Bureaux',
    tabAgents: '5 Curseurs',
    tabMasterPlan: 'Master Plan',
    tabLiveWeb: 'Navigateur',
    tabComms: 'Dialogue',
    tabTools: 'Outils IA',
    statusReportBtn: 'Rapport',
    newProjectPlaceholder: 'Décrivez un projet à exécuter de bout en bout...',
    executeBtn: 'Lancer',
    executingBtn: 'En cours...',
    masterPlanTitle: 'Master Plan du Projet & Sync Cloud',
    masterPlanCloudSynced: 'Synchronisé Cloud',
    masterPlanExtractedValues: 'Valeurs Réelles Extraites & Sources',
    masterPlanNoActive: 'Dictez ou saisissez un objectif pour générer le Master Plan.',
    liveWebUrlPlaceholder: 'URL ou recherche à ouvrir et contrôler...',
    liveWebNavigateBtn: 'Ouvrir',
    liveWebScrollUp: 'Haut',
    liveWebScrollDown: 'Bas',
    liveWebAutoFill: 'Action IA',
    blockerTitle: 'Action Utilisateur ou Connexion Requise',
    blockerSubtitle: 'Un agent a rencontré une étape de connexion dans le Master Plan.',
    blockerApproveMachineMode: 'Autoriser Mode Machine Total',
    blockerCompleteLogin: 'Valider & Continuer',
    blockerDismiss: 'Fermer',
    stateIdle: 'Prêt',
    statePlanning: 'Planifie',
    stateResearching: 'Recherche',
    stateCoding: 'Code',
    stateTesting: 'Système',
    stateHealing: 'Auto-Fix',
    stateCompleted: 'Fini 100%',
    selfToolsTitle: 'Usine d’Outils Autonomes',
    selfToolNamePlaceholder: 'Nom de l’outil',
    selfToolDescPlaceholder: 'Description de l’outil...',
    selfToolBuildBtn: 'Créer & Intégrer',
    googleSearchActive: 'Google Search + Web Ouvert + Synthèse de Code',
    voiceControlHint: 'Contrôle vocal total : dites « Master Plan », « Bureau 2 », « Rapport » ou « Mode Machine »',
  },
  es: {
    brand: 'HEYUKA',
    voicePromptPlaceholder: 'Hable o escriba cualquier proyecto o comando... (Alt+Espacio)',
    voiceButtonIdle: 'Voz',
    voiceButtonListening: 'Escuchando',
    sendButton: 'Ejecutar',
    openStudio: 'Estudio',
    closeStudio: 'Cerrar',
    desktop3D: 'E1 · Núcleo 3D',
    desktopBrowser: 'E2 · Web Vivo',
    desktopMasterPlan: 'E3 · Master Plan',
    desktopWorkspace: 'E4 · Código y Nube',
    machineModeOff: 'Modo Estándar',
    machineModeOn: 'Modo Máquina: ON',
    machineModeTooltip: 'Máquina de ejecución autónoma con auto-reparación técnica',
    swarmHudTitle: 'Enjambre Autónomo y 5 Cursores',
    swarmHudSubtitle: '5 Cursores · Google Search + Código IA · Multi-Escritorio',
    tabAgents: '5 Cursores',
    tabMasterPlan: 'Master Plan',
    tabLiveWeb: 'Navegador',
    tabComms: 'Diálogo',
    tabTools: 'Herramientas',
    statusReportBtn: 'Informe',
    newProjectPlaceholder: 'Describa cualquier proyecto para ejecutar...',
    executeBtn: 'Iniciar',
    executingBtn: 'Ejecutando...',
    masterPlanTitle: 'Master Plan del Proyecto y Nube',
    masterPlanCloudSynced: 'Sincronizado',
    masterPlanExtractedValues: 'Valores Reales Extraídos y Fuentes',
    masterPlanNoActive: 'Hable o escriba un proyecto para generar el Master Plan.',
    liveWebUrlPlaceholder: 'Ingrese URL o búsqueda para abrir y controlar...',
    liveWebNavigateBtn: 'Abrir',
    liveWebScrollUp: 'Subir',
    liveWebScrollDown: 'Bajar',
    liveWebAutoFill: 'Acción IA',
    blockerTitle: 'Inicio de Sesión o Acción Requerida',
    blockerSubtitle: 'Un agente requiere autenticación para continuar el Master Plan.',
    blockerApproveMachineMode: 'Activar Modo Máquina Total',
    blockerCompleteLogin: 'Completar y Continuar',
    blockerDismiss: 'Cerrar',
    stateIdle: 'Listo',
    statePlanning: 'Planeando',
    stateResearching: 'Buscando',
    stateCoding: 'Programando',
    stateTesting: 'Sistema',
    stateHealing: 'Auto-Fix',
    stateCompleted: '100% Listo',
    selfToolsTitle: 'Fábrica de Herramientas Autónomas',
    selfToolNamePlaceholder: 'Nombre de herramienta',
    selfToolDescPlaceholder: 'Descripción de la herramienta...',
    selfToolBuildBtn: 'Crear e Integrar',
    googleSearchActive: 'Google Search + Web Abierta + Síntesis de Código',
    voiceControlHint: 'Control por voz: diga "Master Plan", "Escritorio 2", "Informe" o "Modo Máquina"',
  },
  de: {
    brand: 'HEYUKA',
    voicePromptPlaceholder: 'Sprechen oder tippen Sie ein Projekt oder Kommando... (Alt+Leertaste)',
    voiceButtonIdle: 'Sprache',
    voiceButtonListening: 'Hört zu...',
    sendButton: 'Ausführen',
    openStudio: 'Studio',
    closeStudio: 'Schließen',
    desktop3D: 'D1 · 3D-Kern',
    desktopBrowser: 'D2 · Live-Web',
    desktopMasterPlan: 'D3 · Masterplan',
    desktopWorkspace: 'D4 · Code & Cloud',
    machineModeOff: 'Standardmodus',
    machineModeOn: 'Maschinenmodus: AN',
    machineModeTooltip: 'Vollautonome Ausführungsmaschine mit Selbstheilung',
    swarmHudTitle: 'Autonomer Schwarm & 5 Cursor',
    swarmHudSubtitle: '5 Smart-Cursor · Google Search & KI-Code · Multi-Desktop',
    tabAgents: '5 Cursor',
    tabMasterPlan: 'Masterplan',
    tabLiveWeb: 'Browser',
    tabComms: 'Dialog',
    tabTools: 'KI-Tools',
    statusReportBtn: 'Statusbericht',
    newProjectPlaceholder: 'Projektziel eingeben oder sprechen...',
    executeBtn: 'Starten',
    executingBtn: 'Läuft...',
    masterPlanTitle: 'Projekt-Masterplan & Cloud-Sync',
    masterPlanCloudSynced: 'Cloud-Synchron',
    masterPlanExtractedValues: 'Extrahierte Echtzeit-Werte & Quellen',
    masterPlanNoActive: 'Sprechen oder tippen Sie ein Ziel für den Masterplan.',
    liveWebUrlPlaceholder: 'URL oder Suchbegriff eingeben...',
    liveWebNavigateBtn: 'Öffnen',
    liveWebScrollUp: 'Hoch',
    liveWebScrollDown: 'Runter',
    liveWebAutoFill: 'KI-Aktion',
    blockerTitle: 'Anmeldung oder Bestätigung erforderlich',
    blockerSubtitle: 'Ein Agent hat im Masterplan einen Login-Schritt erreicht.',
    blockerApproveMachineMode: 'Vollautonomen Maschinenmodus aktivieren',
    blockerCompleteLogin: 'Schritt abschließen & weiter',
    blockerDismiss: 'Schließen',
    stateIdle: 'Bereit',
    statePlanning: 'Plant',
    stateResearching: 'Sucht',
    stateCoding: 'Codiert',
    stateTesting: 'OS-Exec',
    stateHealing: 'Self-Heal',
    stateCompleted: '100% Fertig',
    selfToolsTitle: 'Autonome Tool-Fabrik',
    selfToolNamePlaceholder: 'Tool-Name',
    selfToolDescPlaceholder: 'Tool-Beschreibung...',
    selfToolBuildBtn: 'Tool erstellen',
    googleSearchActive: 'Google Search + Open Web + Code-Synthese',
    voiceControlHint: 'Sprachsteuerung: Sagen Sie „Masterplan“, „Desktop 2“, „Statusbericht“ oder „Maschinenmodus“',
  },
  zh: {
    brand: 'HEYUKA',
    voicePromptPlaceholder: '语音或输入任何项目目标与指令... (Alt+Space 开启语音)',
    voiceButtonIdle: '语音',
    voiceButtonListening: '聆听中...',
    sendButton: '执行',
    openStudio: '控制台',
    closeStudio: '关闭',
    desktop3D: '桌面1 · 3D核心',
    desktopBrowser: '桌面2 · 实时网页',
    desktopMasterPlan: '桌面3 · 总体规划',
    desktopWorkspace: '桌面4 · 代码与云端',
    machineModeOff: '标准模式',
    machineModeOn: '执行机器模式: 开启',
    machineModeTooltip: '全自主执行机器模式：自动修复所有技术障碍并端到端完成项目',
    swarmHudTitle: '自主代理群与5大智能光标',
    swarmHudSubtitle: '5智能光标 · Google搜索与AI代码 · 多虚拟桌面',
    tabAgents: '5大光标',
    tabMasterPlan: '总体规划',
    tabLiveWeb: '实时网页',
    tabComms: '协作对话',
    tabTools: '自建工具',
    statusReportBtn: '进度报告',
    newProjectPlaceholder: '输入任何项目目标以端到端执行...',
    executeBtn: '启动',
    executingBtn: '执行中...',
    masterPlanTitle: '项目总体规划 (Master Plan) 与云同步',
    masterPlanCloudSynced: '云端已同步',
    masterPlanExtractedValues: '实时提取的真实数值与来源',
    masterPlanNoActive: '说出或输入项目目标以自动生成总体规划。',
    liveWebUrlPlaceholder: '输入网址或搜索词以打开并控制...',
    liveWebNavigateBtn: '打开网页',
    liveWebScrollUp: '向上滚动',
    liveWebScrollDown: '向下滚动',
    liveWebAutoFill: '代理操作',
    blockerTitle: '需要用户登录或授权确认',
    blockerSubtitle: '代理在执行总体规划时遇到需要登录或验证的页面。',
    blockerApproveMachineMode: '授予全自主机器执行权限',
    blockerCompleteLogin: '完成登录并继续',
    blockerDismiss: '关闭',
    stateIdle: '就绪',
    statePlanning: '规划中',
    stateResearching: '搜索中',
    stateCoding: '编码中',
    stateTesting: '系统执行',
    stateHealing: '自我修复',
    stateCompleted: '100%完成',
    selfToolsTitle: '统一大脑自建工具工厂',
    selfToolNamePlaceholder: '工具名称',
    selfToolDescPlaceholder: '工具功能描述...',
    selfToolBuildBtn: '构建并合入统一大脑',
    googleSearchActive: 'Google搜索 + 开放网络 + AI代码合成',
    voiceControlHint: '全语音控制：可说“显示总体规划”、“切换到桌面2”、“进度报告”或“开启机器模式”',
  },
  ja: {
    brand: 'HEYUKA',
    voicePromptPlaceholder: '音声またはテキストでプロジェクトや指示を入力... (Alt+Spaceで音声)',
    voiceButtonIdle: '音声',
    voiceButtonListening: '聴取中...',
    sendButton: '実行',
    openStudio: 'スタジオ',
    closeStudio: '閉じる',
    desktop3D: 'D1 · 3Dコア',
    desktopBrowser: 'D2 · ライブWeb',
    desktopMasterPlan: 'D3 · マスタープラン',
    desktopWorkspace: 'D4 · コード＆クラウド',
    machineModeOff: '標準モード',
    machineModeOn: 'マシンモード: ON',
    machineModeTooltip: '完全自律実行マシン：技術的障害を自己修復し最後まで遂行します',
    swarmHudTitle: '自律スウォーム＆5スマートカーソル',
    swarmHudSubtitle: '5カーソル · Google検索＆AIコード · マルチデスクトップ',
    tabAgents: '5カーソル',
    tabMasterPlan: 'マスタープラン',
    tabLiveWeb: 'ライブWeb',
    tabComms: '対話ログ',
    tabTools: '自作ツール',
    statusReportBtn: '進捗報告',
    newProjectPlaceholder: 'プロジェクトの目標を入力して完全自動実行...',
    executeBtn: '開始',
    executingBtn: '実行中...',
    masterPlanTitle: 'プロジェクト・マスタープラン＆クラウド同期',
    masterPlanCloudSynced: 'クラウド同期済',
    masterPlanExtractedValues: '抽出された実データと検証済みソース',
    masterPlanNoActive: '音声またはテキストで目標を伝えるとマスタープランが生成されます。',
    liveWebUrlPlaceholder: 'URLまたは検索ワードを入力...',
    liveWebNavigateBtn: 'ページ表示',
    liveWebScrollUp: '上へスクロール',
    liveWebScrollDown: '下へスクロール',
    liveWebAutoFill: 'AI操作',
    blockerTitle: 'ログインまたは承認ステップが必要です',
    blockerSubtitle: 'マスタープランの実行中に認証ステップに到達しました。',
    blockerApproveMachineMode: '完全自律マシンモードを許可',
    blockerCompleteLogin: '完了して続行',
    blockerDismiss: '閉じる',
    stateIdle: '待機中',
    statePlanning: '計画中',
    stateResearching: '検索中',
    stateCoding: '実装中',
    stateTesting: 'OS実行',
    stateHealing: '自己修復',
    stateCompleted: '完了 100%',
    selfToolsTitle: '自律ツール生成ファクトリー',
    selfToolNamePlaceholder: 'ツール名',
    selfToolDescPlaceholder: 'ツールの説明...',
    selfToolBuildBtn: '構築して統合',
    googleSearchActive: 'Google検索 + オープンWeb + AIコード合成',
    voiceControlHint: '完全音声操作：「マスタープラン」「デスクトップ2」「進捗報告」「マシンモード」と話しかけてください',
  },
};

interface LanguageContextValue {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: TranslationDictionary;
  meta: LanguageMeta;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: TRANSLATIONS.en,
  meta: SUPPORTED_LANGUAGES[0],
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('nevea_ui_lang') as SupportedLanguage | null;
      if (saved && TRANSLATIONS[saved]) return saved;
    } catch {}
    // Default initial language across all sessions is strictly English ('en')
    return 'en';
  });

  const setLang = useCallback((next: SupportedLanguage) => {
    if (!TRANSLATIONS[next]) return;
    setLangState(next);
    try {
      localStorage.setItem('nevea_ui_lang', next);
      document.documentElement.lang = next;
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    } catch {}
  }, []);

  useEffect(() => {
    const handleVoiceLangSwitch = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.lang && TRANSLATIONS[detail.lang as SupportedLanguage]) {
        setLang(detail.lang as SupportedLanguage);
      }
    };
    window.addEventListener('nevea:set-language', handleVoiceLangSwitch);
    return () => window.removeEventListener('nevea:set-language', handleVoiceLangSwitch);
  }, [setLang]);

  const meta = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return React.createElement(
    LanguageContext.Provider,
    { value: { lang, setLang, t, meta } },
    children
  );
};

export const useLanguage = () => useContext(LanguageContext);

/**
 * Detects natural voice/text language switch commands in any language
 */
export function detectVoiceLanguageSwitch(input: string): SupportedLanguage | null {
  const lower = String(input || '').trim().toLowerCase();
  if (
    lower.includes('switch to english') ||
    lower.includes('language english') ||
    lower.includes('بالانجليزية') ||
    lower.includes('اللغة الانجليزية')
  ) {
    return 'en';
  }
  if (
    lower.includes('switch to arabic') ||
    lower.includes('language arabic') ||
    lower.includes('بدل اللغة للعربية') ||
    lower.includes('حول للعربية') ||
    lower.includes('اللغة العربية')
  ) {
    return 'ar';
  }
  if (
    lower.includes('switch to french') ||
    lower.includes('en français') ||
    lower.includes('بالفرنسية') ||
    lower.includes('اللغة الفرنسية')
  ) {
    return 'fr';
  }
  if (
    lower.includes('switch to spanish') ||
    lower.includes('en español') ||
    lower.includes('بالاسبانية')
  ) {
    return 'es';
  }
  if (
    lower.includes('switch to german') ||
    lower.includes('auf deutsch') ||
    lower.includes('بالالمانية')
  ) {
    return 'de';
  }
  if (
    lower.includes('switch to chinese') ||
    lower.includes('切换到中文') ||
    lower.includes('بالصينية')
  ) {
    return 'zh';
  }
  if (
    lower.includes('switch to japanese') ||
    lower.includes('日本語に切り替え') ||
    lower.includes('باليابانية')
  ) {
    return 'ja';
  }
  return null;
}
