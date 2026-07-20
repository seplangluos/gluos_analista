// Sistema GLUOS - Gerência de Licenciamento de Uso e Ocupação do Solo
// Integração completa com Firebase - Versão com Firebase Authentication
// Importações do Firebase v9+
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getDatabase, ref, push, set, get, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

// Configuração do Firebase principal
const firebaseConfig = {
  apiKey: "AIzaSyA0VMrw376nud-wBXrgmuHwMjx4Ca0oPH8",
  authDomain: "gluos-analistas.firebaseapp.com",
  databaseURL: "https://gluos-analistas-default-rtdb.firebaseio.com",
  projectId: "gluos-analistas",
  storageBucket: "gluos-analistas.firebasestorage.app",
  messagingSenderId: "897464498657",
  appId: "1:897464498657:web:64ad17ffc97f44796cfaa0"
};

// Configuração da base de processos (NOVA)
const firebaseConfigProcessos = {
  apiKey: "AIzaSyAWbo9MCRjE4776A_DpjJCWHPZap-goJDg",
  authDomain: "processos-gluos.firebaseapp.com",
  databaseURL: "https://processos-gluos-default-rtdb.firebaseio.com",
  projectId: "processos-gluos",
  storageBucket: "processos-gluos.firebasestorage.app",
  messagingSenderId: "189917349181",
  appId: "1:189917349181:web:efac81f4ed118cb48af154"
};

// Inicializar Firebase principal
let app, database, auth;
try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  auth = getAuth(app);
} catch (error) {
  console.error('Erro ao inicializar Firebase:', error);
}

// Inicializar Firebase de processos (NOVO)
let processosApp, processosDatabase;
try {
  processosApp = initializeApp(firebaseConfigProcessos, 'processosApp');
  processosDatabase = getDatabase(processosApp);
} catch (error) {
  console.error('Erro ao inicializar Firebase de processos:', error);
}

// Mapeamento de usuários para emails
const USER_EMAIL_MAPPING = {
  "Pedro": "pedro@hotmail.com",
  "Rogério": "rogerio@hotmail.com",
  "Isadora": "isadora@hotmail.com",
  "Andreza": "andreza@hotmail.com",
  "Hélica": "helica@hotmail.com",
  "Juliana": "juliana@hotmail.com",
  "Frederico": "frederico@hotmail.com",
  "Gabriella": "gabriella@hotmail.com",
  "Renata": "renata@hotmail.com",
  "Ana Luiza": "analuiza@hotmail.com",
  "Maysa": "maysa@hotmail.com",
  "Marcella": "marcella@hotmail.com",
  "Lúcia": "lucia@hotmail.com",
  "Admin": "seplan.gluos@valadares.mg.gov.br"
};

// Função para converter email para nome de usuário
function emailToUsername(email) {
  for (const [username, userEmail] of Object.entries(USER_EMAIL_MAPPING)) {
    if (userEmail === email) {
      return username;
    }
  }
  return email; // Retorna o email se não encontrar o mapeamento
}

// Dados da aplicação
const GLUOS_DATA = {
  usuarios: ["Pedro", "Rogério", "Isadora", "Andreza", "Hélica", "Juliana", "Frederico", "Gabriella", "Renata", "Ana Luiza", "Maysa", "Marcella", "Lúcia", "Admin"],
  assuntos: [
    {id: 1, texto: "Deferimento de Processo"},
    {id: 2, texto: "Notificação de processo"},
    {id: 3, texto: "Enc. a GCT/Topografia (passo)"},
    {id: 4, texto: "Enc. Vistoria"},
    {id: 5, texto: "Atendimento (RT/Contribuinte)"},
    {id: 6, texto: "Indeferimento de Processo"},
    {id: 7, texto: "Passo (outros setores)"},
    {id: 8, texto: "Tranferido"},
    {id: 9, texto: "Visita de vistoria"},
    {id: 9, texto: "Conformidade/Antena"},
    {id: 9, texto: "Declarações"},
  ]
};

// Estado global
let currentUser = null;
let allEntries = [];
let processCounter = 1;
let selectedSubjectForMultiple = null;
let currentReportType = null;
let firebaseConnected = false;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
  console.log('Sistema GLUOS iniciando...');
  
  // Forçar recriação do select com JavaScript para garantir funcionalidade
  fixUserSelect();
  initializeFirebase();
  setupEventListeners();
  populateSelectOptions();
  showScreen('login');
  updateDateTime();
  setInterval(updateDateTime, 1000);
  
  console.log('Sistema inicializado com sucesso!');
});

// Corrigir o select de usuário
function fixUserSelect() {
  const userSelect = document.getElementById('user-select');
  if (userSelect) {
    // Forçar z-index e pointer events
    userSelect.style.zIndex = '1000';
    userSelect.style.pointerEvents = 'auto';
    userSelect.style.position = 'relative';
    
    // Adicionar event listeners diretos
    userSelect.addEventListener('change', function() {
      console.log('Usuário selecionado:', this.value);
    });
    
    userSelect.addEventListener('click', function() {
      console.log('Select clicado');
      this.focus();
    });
    
    // Garantir que está funcional
    userSelect.removeAttribute('disabled');
    userSelect.setAttribute('tabindex', '0');
    
    console.log('Select de usuário corrigido');
  }
}

// Inicialização do Firebase
async function initializeFirebase() {
  try {
    updateFirebaseStatus('warning', 'Conectando ao Firebase...');
    
    if (!database || !auth) {
      updateFirebaseStatus('error', 'Firebase não inicializado');
      console.error('Database ou Auth não inicializado');
      return;
    }
    
    // Verificar conexão com Firebase
    const testRef = ref(database, '.info/connected');
    onValue(testRef, (snapshot) => {
      firebaseConnected = snapshot.val() === true;
      if (firebaseConnected) {
        updateFirebaseStatus('success', 'Conectado ao Firebase');
        console.log('Firebase conectado com sucesso');
        loadAllEntries();
      } else {
        updateFirebaseStatus('error', 'Desconectado do Firebase');
        console.log('Firebase desconectado');
      }
    });
    
  } catch (error) {
    console.error('Erro ao conectar Firebase:', error);
    updateFirebaseStatus('error', 'Erro de conexão');
    firebaseConnected = false;
  }
}

// Carregar todas as entradas
async function loadAllEntries() {
  if (!firebaseConnected) return;
  
  try {
    const entriesRef = ref(database, 'gluos_entries');
    onValue(entriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        allEntries = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        // Ordenar por timestamp (mais recente primeiro)
        allEntries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        console.log(`Carregadas ${allEntries.length} entradas`);
      } else {
        allEntries = [];
        console.log('Nenhuma entrada encontrada');
      }
      updateRecordCount();
    });
  } catch (error) {
    console.error('Erro ao carregar entradas:', error);
    allEntries = [];
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Login - múltiplas abordagens para garantir funcionamento
  const loginForm = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');
  const userSelect = document.getElementById('user-select');
  const passwordInput = document.getElementById('password');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    console.log('Event listener do form de login adicionado');
  }
  
  if (loginBtn) {
    loginBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleLogin(e);
    });
    console.log('Event listener do botão de login adicionado');
  }
  
  // Enter nos campos
  if (passwordInput) {
    passwordInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin(e);
      }
    });
  }
  
  if (userSelect) {
    userSelect.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && this.value) {
        passwordInput?.focus();
      }
    });
  }
  
  // Navegação principal
  setupMainNavigation();
  
  // Nova entrada
  setupNewEntry();
  
  // Múltiplas entradas
  setupMultipleEntries();
  
  // Pesquisa
  setupSearch();
  
  // Base de dados
  setupDatabase();
  
  // Relatórios
  setupReports();
    // Setup Vários Novos
    setupBulkEntries();
    // Setup Novo: Vários assuntos
    setupMultiSubjectEntries();
  
  // Perfil
  setupProfile();
  
  // Modais
  setupModals();
  
  console.log('Todos os event listeners configurados');
}

// Configurar navegação principal
function setupMainNavigation() {
  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Botões do dashboard
  const navButtons = [
    { id: 'new-entry-btn', screen: 'new-entry' },
    { id: 'multiple-entries-btn', screen: 'multiple-entries' },
    { id: 'bulk-entries-btn', screen: 'bulk-entries' },
        { id: 'multi-subject-entries-btn', screen: 'multi-subject-entries' },
    { id: 'search-btn', screen: 'search' },
    { id: 'database-btn', screen: 'database', callback: loadDatabaseTable },
    { id: 'profile-btn', callback: showProfileModal },
    { id: 'report-btn', screen: 'report' }
  ];
  
  navButtons.forEach(btn => {
    const element = document.getElementById(btn.id);
    if (element) {
      element.addEventListener('click', function() {
        console.log(`Botão ${btn.id} clicado`);
        if (btn.screen) {
          showScreen(btn.screen);
        }
        if (btn.callback) {
          btn.callback();
        }
      });
    }
  });
  
  // Botões de voltar
  const backButtons = [
    'back-to-dashboard-1', 'back-to-dashboard-2', 'back-to-dashboard-3', 
    'back-to-dashboard-4', 'back-to-dashboard-5',
        'back-to-dashboard-6',
        'back-to-dashboard-7'
  ];
  
  backButtons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => showScreen('dashboard'));
    }
  });
}

// Login com Firebase Authentication
async function handleLogin(e) {
  e.preventDefault();
  console.log('=== PROCESSANDO LOGIN ===');

  const userSelect = document.getElementById('user-select');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  if (!userSelect || !passwordInput) {
    console.error('Elementos de login não encontrados');
    alert('Erro interno: elementos de login não encontrados');
    return;
  }

  const user = userSelect.value?.trim();
  const password = passwordInput.value?.trim();

  console.log('Dados do login:', { 
    user, 
    password, 
    userLength: user?.length, 
    passwordLength: password?.length 
  });

  // Limpar erro anterior
  if (loginError) {
    loginError.classList.add('hidden');
    loginError.textContent = '';
  }

  // Validação
  if (!user) {
    showLoginError('Por favor, selecione um usuário.');
    return;
  }

  if (!password) {
    showLoginError('Por favor, digite sua senha.');
    return;
  }

  // Obter email do usuário
  const userEmail = USER_EMAIL_MAPPING[user];
  if (!userEmail) {
    showLoginError('Usuário não encontrado.');
    return;
  }

  // Loading state
  setButtonLoading(loginBtn, true);

  try {
    // Autenticação usando Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
    const firebaseUser = userCredential.user;

    // Login bem-sucedido!
    console.log('=== LOGIN BEM-SUCEDIDO ===', { 
      usuario: user, 
      email: firebaseUser.email,
      uid: firebaseUser.uid 
    });
    
    currentUser = user; // Manter o nome do usuário, não o email
    updateUserInfo();

    // Limpar formulário
    userSelect.value = '';
    passwordInput.value = '';

    // Ir para dashboard
    showScreen('dashboard');

  } catch (error) {
    // Em caso de erro de autenticação
    console.error('Erro no login:', error);
    
    // Mensagens de erro mais específicas
    if (error.code === 'auth/user-not-found') {
      showLoginError('Usuário não encontrado no sistema.');
    } else if (error.code === 'auth/wrong-password') {
      showLoginError('Senha incorreta.');
    } else if (error.code === 'auth/invalid-email') {
      showLoginError('Email inválido.');
    } else if (error.code === 'auth/too-many-requests') {
      showLoginError('Muitas tentativas. Tente novamente mais tarde.');
    } else {
      showLoginError('Usuário ou senha inválidos.');
    }
  } finally {
    setButtonLoading(loginBtn, false);
  }
}

function showLoginError(message) {
  console.log('Erro de login:', message);
  const loginError = document.getElementById('login-error');
  if (loginError) {
    loginError.textContent = message;
    loginError.classList.remove('hidden');
  } else {
    alert(message);
  }
}

function handleLogout() {
  currentUser = null;
  updateUserInfo();
  showScreen('login');
  console.log('Logout realizado');
}

// Nova entrada
function setupNewEntry() {
  const form = document.getElementById('new-entry-form');
  const subjectNumber = document.getElementById('subject-number');
  const subjectSelect = document.getElementById('subject-select');
  const processNumberInput = document.getElementById('process-number');
  const contributorInput = document.getElementById('contributor');
  const ctmInput = document.getElementById('ctm');

  if (form) {
    form.addEventListener('submit', handleNewEntry);
  }

  // Auto-preencher assunto pelo número
  if (subjectNumber && subjectSelect) {
    subjectNumber.addEventListener('input', function() {
      const num = parseInt(this.value);
      if (num >= 1 && num <= 50) {
        const assunto = GLUOS_DATA.assuntos.find(a => a.id === num);
        if (assunto) {
          subjectSelect.value = assunto.id;
        }
      }
    });

    // Sincronizar select com número
    subjectSelect.addEventListener('change', function() {
      if (this.value) {
        subjectNumber.value = this.value;
      }
    });
  }

  // NOVA FUNCIONALIDADE: Autopreenchimento baseado no número do processo
  if(processNumberInput && contributorInput && ctmInput) {
	processNumberInput.addEventListener('input', async function () {
   	let numeroProcesso = this.value.trim();
   	numeroProcesso = numeroProcesso.replace(/\//g, "-"); // <-- só aqui!
   	if (!numeroProcesso) {
     		contributorInput.value = '';
      		ctmInput.value = '';
      return;
   }

      try {
        if (processosDatabase) {
          const refProc = ref(processosDatabase, 'processos/' + numeroProcesso);
          const snapshot = await get(refProc);
          if (snapshot.exists()) {
            const dados = snapshot.val();
            contributorInput.value = dados.Requerente || '';
            ctmInput.value = dados.CTM || '';
          } else {
            contributorInput.value = '';
            ctmInput.value = '';
          }
        }
      } catch (err) {
        console.error('Erro ao buscar processo:', err);
        contributorInput.value = '';
        ctmInput.value = '';
      }
    });
  }
}

async function handleNewEntry(e) {
  e.preventDefault();
  console.log('Processando nova entrada...');

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  // Coletar dados do formulário
  const subjectId = parseInt(document.getElementById('subject-select').value);
  const processNumber = document.getElementById('process-number').value.trim();

  if (!subjectId) {
    alert('Por favor, selecione um assunto.');
    return;
  }

  if (!processNumber) {
    alert('Por favor, informe o número do processo.');
    return;
  }

  const assunto = GLUOS_DATA.assuntos.find(a => a.id === subjectId);
  const now = new Date();

  const entry = {
    subjectId: subjectId,
    subjectText: assunto ? assunto.texto : '',
    processNumber: processNumber,
    contributor: document.getElementById('contributor').value.trim(),
    ctm: document.getElementById('ctm').value.trim(),
    observation: document.getElementById('observation').value.trim(),
    habiteNumber: document.getElementById('habite-number').value.trim(),
    alvaraSituation: document.getElementById('alvara-situation').value.trim(),
    server: currentUser,
    date: now.toLocaleDateString('pt-BR'),
    time: now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
    timestamp: now.getTime()
  };

  setButtonLoading(submitBtn, true);

  try {
    // Salvar no Firebase se conectado
    if (firebaseConnected && database) {
      const entriesRef = ref(database, 'gluos_entries');
      await push(entriesRef, entry);
      console.log('Entrada salva no Firebase:', entry);
    } else {
      // Salvar localmente se Firebase não estiver disponível
      entry.id = 'local_' + Date.now();
      allEntries.unshift(entry);
      console.log('Entrada salva localmente:', entry);
    }

    // Limpar formulário
    form.reset();
    document.getElementById('subject-number').value = '';

    // Mostrar sucesso
    showSuccessModal('Entrada salva com sucesso!');

  } catch (error) {
    console.error('Erro ao salvar entrada:', error);
    alert('Erro ao salvar entrada. Tente novamente.');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

// Múltiplas entradas
function setupMultipleEntries() {
  const setSubjectBtn = document.getElementById('set-subject-btn');
  const addProcessBtn = document.getElementById('add-process-btn');
  const saveAllBtn = document.getElementById('save-all-btn');
  const multiSubjectNumber = document.getElementById('multi-subject-number');
  const multiSubjectSelect = document.getElementById('multi-subject-select');

  if (setSubjectBtn) {
    setSubjectBtn.addEventListener('click', handleSetSubject);
  }

  if (addProcessBtn) {
    addProcessBtn.addEventListener('click', addProcessForm);
  }

  if (saveAllBtn) {
    saveAllBtn.addEventListener('click', handleSaveAllEntries);
  }

  // Auto-preencher assunto pelo número
  if (multiSubjectNumber && multiSubjectSelect) {
    multiSubjectNumber.addEventListener('input', function() {
      const num = parseInt(this.value);
      if (num >= 1 && num <= 50) {
        const assunto = GLUOS_DATA.assuntos.find(a => a.id === num);
        if (assunto) {
          multiSubjectSelect.value = assunto.id;
        }
      }
    });

    // Sincronizar select com número
    multiSubjectSelect.addEventListener('change', function() {
      if (this.value) {
        multiSubjectNumber.value = this.value;
      }
    });
  }
}

function handleSetSubject() {
  const subjectId = parseInt(document.getElementById('multi-subject-select').value);
  if (!subjectId) {
    alert('Por favor, selecione um assunto.');
    return;
  }

  const assunto = GLUOS_DATA.assuntos.find(a => a.id === subjectId);
  selectedSubjectForMultiple = assunto;

  // Mostrar seção de formulários
  const container = document.getElementById('multiple-forms-container');
  const subjectText = document.getElementById('selected-subject-text');

  if (container && subjectText && assunto) {
    subjectText.textContent = assunto.texto;
    container.classList.remove('hidden');

    // Limpar formulários anteriores e adicionar o primeiro
    document.getElementById('processes-container').innerHTML = '';
    processCounter = 1;
    addProcessForm();
  }
}

function addProcessForm() {
    if (!selectedSubjectForMultiple) return;
    
    const container = document.getElementById('processes-container');
    if (!container) return;
    
    const formHtml = `
        <div class="process-form card" data-process="${processCounter}">
            <div class="card__body">
                <div class="process-form-header">
                    <h4>Processo ${processCounter}</h4>
                    <button type="button" class="remove-process-btn" onclick="removeProcessForm(${processCounter})">Remover</button>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Nº Processo/Protocolo: *</label>
                    <input type="text" class="form-control process-number" placeholder="informe número do processo ou protocolo, ou digite 0" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Contribuinte:</label>
                    <input type="text" class="form-control process-contributor" placeholder="Nome do contribuinte">
                </div>
                
                <div class="form-group">
                    <label class="form-label">CTM:</label>
                    <input type="text" class="form-control process-ctm" placeholder="CTM">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Observação:</label>
                    <textarea class="form-control process-observation" rows="3" placeholder="Observações"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Número do Habite-se/Alvará:</label>
                    <input type="text" class="form-control process-habite" placeholder="Número do Habite-se/Alvará">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Situação do Alvará de Funcionamento:</label>
                    <select class="form-control process-alvara">
                        <option value="">-- Selecione --</option>
                        <option value="Deferido">Deferido</option>
                        <option value="Indeferido">Indeferido</option>
                        <option value="Em Análise">Em Análise</option>
                        <option value="Pendente">Pendente</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', formHtml);
    processCounter++;
}

window.removeProcessForm = function(processId) {
    const form = document.querySelector(`[data-process="${processId}"]`);
    if (form) {
        form.remove();
    }
};

async function handleSaveAllEntries() {
    if (!selectedSubjectForMultiple) {
        alert('Nenhum assunto selecionado.');
        return;
    }
    
    const processForms = document.querySelectorAll('.process-form');
    if (processForms.length === 0) {
        alert('Nenhum processo adicionado.');
        return;
    }
    
    const saveAllBtn = document.getElementById('save-all-btn');
    setButtonLoading(saveAllBtn, true);
    
    const entries = [];
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
    const timestamp = now.getTime();
    
    // Coletar dados de todos os formulários
    processForms.forEach(form => {
        const processNumber = form.querySelector('.process-number').value.trim();
        
        if (processNumber) { // Só salvar se tiver número do processo
            const entry = {
                subjectId: selectedSubjectForMultiple.id,
                subjectText: selectedSubjectForMultiple.texto,
                processNumber: processNumber,
                contributor: form.querySelector('.process-contributor').value.trim(),
                ctm: form.querySelector('.process-ctm').value.trim(),
                observation: form.querySelector('.process-observation').value.trim(),
                habiteNumber: form.querySelector('.process-habite').value.trim(),
                alvaraSituation: form.querySelector('.process-alvara').value.trim(),
                server: currentUser,
                date: date,
                time: time,
                timestamp: timestamp
            };
            entries.push(entry);
        }
    });
    
    if (entries.length === 0) {
        alert('Por favor, preencha pelo menos um número de processo.');
        setButtonLoading(saveAllBtn, false);
        return;
    }
    
    try {
        // Salvar entradas
        if (firebaseConnected && database) {
            const entriesRef = ref(database, 'gluos_entries');
            const promises = entries.map(entry => push(entriesRef, entry));
            await Promise.all(promises);
            console.log(`${entries.length} entradas salvas no Firebase`);
        } else {
            // Salvar localmente
            entries.forEach((entry, index) => {
                entry.id = 'local_' + (Date.now() + index);
                allEntries.unshift(entry);
            });
            console.log(`${entries.length} entradas salvas localmente`);
        }
        
        // Limpar tudo
        selectedSubjectForMultiple = null;
        document.getElementById('multiple-forms-container').classList.add('hidden');
        document.getElementById('multi-subject-number').value = '';
        document.getElementById('multi-subject-select').value = '';
        document.getElementById('processes-container').innerHTML = '';
        processCounter = 1;
        
        showSuccessModal(`${entries.length} entrada(s) salva(s) com sucesso!`);
        
    } catch (error) {
        console.error('Erro ao salvar entradas:', error);
        alert('Erro ao salvar entradas. Tente novamente.');
    } finally {
        setButtonLoading(saveAllBtn, false);
    }
}

// Pesquisa
function setupSearch() {
    // Abas de pesquisa
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchSearchTab(tabName);
        });
    });
    
    // Botão de pesquisar
    const searchBtn = document.getElementById('search-submit');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
}

function switchSearchTab(tabName) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    
    // Atualizar abas
    document.querySelectorAll('.search-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName + '-search')?.classList.add('active');
}

async function handleSearch() {
    const activeTab = document.querySelector('.search-tab.active');
    if (!activeTab) return;
    
    const searchBtn = document.getElementById('search-submit');
    setButtonLoading(searchBtn, true);
    
    let filteredEntries = [];
    
    try {
        if (activeTab.id === 'process-search') {
            const processNumber = document.getElementById('search-process').value.trim();
            if (!processNumber) {
                alert('Digite o número do processo.');
                return;
            }
            filteredEntries = allEntries.filter(entry => 
                entry.processNumber && entry.processNumber.toLowerCase().includes(processNumber.toLowerCase())
            );
        } else if (activeTab.id === 'date-search') {
            const searchDate = document.getElementById('search-date').value;
            if (!searchDate) {
                alert('Selecione uma data.');
                return;
            }
            const targetDate = new Date(searchDate + 'T00:00:00').toLocaleDateString('pt-BR');
            filteredEntries = allEntries.filter(entry => entry.date === targetDate);
        } else if (activeTab.id === 'server-search') {
            const serverName = document.getElementById('search-server').value;
            if (!serverName) {
                alert('Selecione um servidor.');
                return;
            }
            filteredEntries = allEntries.filter(entry => entry.server === serverName);
        }
        
        displaySearchResults(filteredEntries);
        
    } catch (error) {
        console.error('Erro na pesquisa:', error);
        alert('Erro ao pesquisar. Tente novamente.');
    } finally {
        setButtonLoading(searchBtn, false);
    }
}

function displaySearchResults(entries) {
    const resultsContainer = document.getElementById('search-results');
    const tableBody = document.querySelector('#search-table tbody');
    
    if (!resultsContainer || !tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (entries.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">Nenhum resultado encontrado.</td>
            </tr>
        `;
    } else {
        entries.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date || '-'}</td>
                <td>${entry.time || '-'}</td>
                <td>${entry.server || '-'}</td>
                <td>${entry.processNumber || '-'}</td>
                <td title="${entry.subjectText || '-'}">${truncateText(entry.subjectText || '-', 30)}</td>
                <td>${entry.contributor || '-'}</td>
                <td>${entry.ctm || '-'}</td>
                <td title="${entry.observation || '-'}">${truncateText(entry.observation || '-', 40)}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    resultsContainer.classList.remove('hidden');
}

// Base de dados
function setupDatabase() {
    const applyBtn = document.getElementById('apply-filters');
    const clearBtn = document.getElementById('clear-filters');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyDatabaseFilters);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearDatabaseFilters);
    }
    
    // Configurar paginação
    setupPaginationEventListeners();
} {
    const applyBtn = document.getElementById('apply-filters');
    const clearBtn = document.getElementById('clear-filters');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyDatabaseFilters);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearDatabaseFilters);
    }
}

function loadDatabaseTable(entries = null) {
    const entriesToShow = entries || allEntries;

    // Atualizar contador total
    const totalRecords = document.getElementById('total-records');
    if (totalRecords) {
        totalRecords.textContent = `${entriesToShow.length} registro(s)`;
    }

    // Se não há entradas, mostrar mensagem
    if (entriesToShow.length === 0) {
        const tableBody = document.querySelector('#database-table tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">Nenhum registro encontrado.</td>
                </tr>
            `;
        }
        hidePaginationControls();
        return;
    }

    // Inicializar paginação
    initializePagination(entriesToShow);
}

function applyDatabaseFilters() {
    const serverFilter = document.getElementById('filter-server').value;
    const subjectFilter = document.getElementById('filter-subject').value;
    const dateFilter = document.getElementById('filter-date').value;
    
    let filteredEntries = [...allEntries];
    
    if (serverFilter) {
        filteredEntries = filteredEntries.filter(entry => entry.server === serverFilter);
    }
    
    if (subjectFilter) {
        filteredEntries = filteredEntries.filter(entry => entry.subjectId === parseInt(subjectFilter));
    }
    
    if (dateFilter) {
        const targetDate = new Date(dateFilter + 'T00:00:00').toLocaleDateString('pt-BR');
        filteredEntries = filteredEntries.filter(entry => entry.date === targetDate);
    }
    
    loadDatabaseTable(filteredEntries);
}

function clearDatabaseFilters() {
    document.getElementById('filter-server').value = '';
    document.getElementById('filter-subject').value = '';
    document.getElementById('filter-date').value = '';
    loadDatabaseTable();
}

// Funções globais para editar/excluir
window.editEntry = function(entryId) {
    const entry = allEntries.find(e => e.id === entryId);
    if (!entry) {
        alert('Entrada não encontrada.');
        return;
    }
    
    if (entry.server !== currentUser) {
        alert('Você só pode editar suas próprias entradas.');
        return;
    }
    
    showEditModal(entry);
};

window.deleteEntry = async function(entryId) {
    const entry = allEntries.find(e => e.id === entryId);
    if (!entry) {
        alert('Entrada não encontrada.');
        return;
    }
    
    if (entry.server !== currentUser) {
        alert('Você só pode excluir suas próprias entradas.');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta entrada?')) {
        return;
    }
    
    try {
        if (firebaseConnected && database && !entryId.startsWith('local_')) {
            const entryRef = ref(database, `gluos_entries/${entryId}`);
            await remove(entryRef);
            console.log('Entrada excluída do Firebase:', entryId);
        } else {
            // Remover localmente
            allEntries = allEntries.filter(e => e.id !== entryId);
            updateRecordCount();
            console.log('Entrada excluída localmente:', entryId);
        }
        
        showSuccessModal('Entrada excluída com sucesso!');
        
    } catch (error) {
        console.error('Erro ao excluir entrada:', error);
        alert('Erro ao excluir entrada. Tente novamente.');
    }
};

// Relatórios
function setupReports() {
    const personalBtn = document.getElementById('personal-report-btn');
    const completeBtn = document.getElementById('complete-report-btn');
    const generateBtn = document.getElementById('generate-report-btn');
    
    if (personalBtn) {
        personalBtn.addEventListener('click', () => {
            currentReportType = 'personal';
            showReportForm('Relatório Pessoal');
        });
    }
    
    if (completeBtn) {
        completeBtn.addEventListener('click', () => {
            currentReportType = 'complete';
            showReportForm('Relatório Completo');
        });
    }
    
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateReport);
    }
}

function showReportForm(title) {
    const form = document.getElementById('report-form');
    const formTitle = document.getElementById('report-form-title');
    
    if (form && formTitle) {
        formTitle.textContent = title;
        form.classList.remove('hidden');
        
        // Definir datas padrão (mês atual)
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const startInput = document.getElementById('report-start-date');
        const endInput = document.getElementById('report-end-date');
        
        if (startInput) startInput.value = firstDay.toISOString().split('T')[0];
        if (endInput) endInput.value = today.toISOString().split('T')[0];
    }
}

async function handleGenerateReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        alert('Selecione as datas inicial e final.');
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert('A data inicial não pode ser maior que a data final.');
        return;
    }
    
    const generateBtn = document.getElementById('generate-report-btn');
    setButtonLoading(generateBtn, true);
    
    try {
        if (currentReportType === 'personal') {
            generatePersonalReport(startDate, endDate);
        } else if (currentReportType === 'complete') {
            generateCompleteReport(startDate, endDate);
        }
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
        setButtonLoading(generateBtn, false);
    }
}

function generatePersonalReport(startDate, endDate) {
    // Filtrar entradas do usuário atual no período
    const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
    const endTimestamp = new Date(endDate + 'T23:59:59').getTime();
    
    const userEntries = allEntries.filter(entry => {
        return entry.server === currentUser &&
               entry.timestamp >= startTimestamp &&
               entry.timestamp <= endTimestamp;
    });
    
    // Contar por assunto
    const subjectCount = {};
    userEntries.forEach(entry => {
        if (!subjectCount[entry.subjectId]) {
            subjectCount[entry.subjectId] = {
                id: entry.subjectId,
                text: entry.subjectText,
                count: 0
            };
        }
        subjectCount[entry.subjectId].count++;
    });
    
    const totalEntries = userEntries.length;
    const reportData = Object.values(subjectCount).map(subject => ({
        ...subject,
        percentage: totalEntries > 0 ? ((subject.count / totalEntries) * 100).toFixed(1) : '0.0'
    }));
    
    reportData.sort((a, b) => b.count - a.count);
    
    displayPersonalReport(reportData, totalEntries, startDate, endDate);
}

function displayPersonalReport(reportData, totalEntries, startDate, endDate) {
    // Atualizar cabeçalho
    const reportTitle = document.getElementById('report-title');
    const reportMeta = document.getElementById('report-meta');
    
    if (reportTitle) {
        reportTitle.textContent = 'Relatório Pessoal de Produtividade';
    }
    
    if (reportMeta) {
        reportMeta.innerHTML = `
            <p><strong>Usuário:</strong> ${currentUser}</p>
            <p><strong>Período:</strong> ${formatDateBR(startDate)} a ${formatDateBR(endDate)}</p>
            <p><strong>Total de Entradas:</strong> ${totalEntries}</p>
        `;
    }
    
    // Criar tabela
    const tableHead = document.getElementById('report-table-head');
    const tableBody = document.getElementById('report-table-body');
    const tableFoot = document.getElementById('report-table-foot');
    
    if (tableHead) {
        tableHead.innerHTML = `
            <tr>
                <th>Assunto</th>
                <th>Total</th>
                <th>%</th>
            </tr>
        `;
    }
    
    if (tableBody) {
        tableBody.innerHTML = '';
        
        if (reportData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center">Nenhum registro encontrado no período.</td>
                </tr>
            `;
        } else {
            reportData.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.text}</td>
                    <td>${item.count}</td>
                    <td>${item.percentage}%</td>
                `;
                tableBody.appendChild(row);
            });
        }
    }
    
    if (tableFoot) {
        tableFoot.innerHTML = `
            <tr>
                <th><strong>TOTAL GERAL</strong></th>
                <th><strong>${totalEntries}</strong></th>
                <th><strong>100%</strong></th>
            </tr>
        `;
    }
    
    // Calcular estatísticas adicionais
    const summary = document.getElementById('summary-content');
    if (summary && totalEntries > 0) {
        const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
        const endTimestamp = new Date(endDate + 'T23:59:59').getTime();
        
        // Calcular dias com atividade
        const dates = [...new Set(allEntries
            .filter(entry => entry.server === currentUser &&
                           entry.timestamp >= startTimestamp &&
                           entry.timestamp <= endTimestamp)
            .map(entry => entry.date))];
        
        const activeDays = dates.length;
        const avgPerDay = activeDays > 0 ? (totalEntries / activeDays).toFixed(1) : '0.0';
        
        summary.innerHTML = `
            <p><strong>Dias com atividade:</strong> ${activeDays}</p>
            <p><strong>Média diária:</strong> ${avgPerDay} entradas/dia</p>
        `;
        
        document.getElementById('report-summary').classList.remove('hidden');
    } else {
        document.getElementById('report-summary').classList.add('hidden');
    }
    
    // Mostrar resultados
    document.getElementById('report-results').classList.remove('hidden');
}

function generateCompleteReport(startDate, endDate) {
    // Filtra "Admin" da lista de usuários
    const usersWithoutAdmin = GLUOS_DATA.usuarios.filter(user => user !== "Admin");
    
    // Filtrar entradas no período
    const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
    const endTimestamp = new Date(endDate + 'T23:59:59').getTime();
    
    const periodEntries = allEntries.filter(entry => {
        return entry.timestamp >= startTimestamp && entry.timestamp <= endTimestamp;
    });
    
    // Criar matriz: [assunto][usuário] = quantidade
    const reportMatrix = {};
    const userTotals = {};
    const subjectTotals = {};
    let grandTotal = 0;
    
    // Inicializar totais
    usersWithoutAdmin.forEach(user => {
        userTotals[user] = 0;
    });
    
    // Inicializar matriz com todos os assuntos
    GLUOS_DATA.assuntos.forEach(subject => {
        reportMatrix[subject.id] = {
            id: subject.id,
            text: subject.texto,
            users: {}
        };
        subjectTotals[subject.id] = 0;
        
        usersWithoutAdmin.forEach(user => {
            reportMatrix[subject.id].users[user] = 0;
        });
    });
    
    // Processar entradas
    periodEntries.forEach(entry => {
        const subjectId = entry.subjectId;
        const user = entry.server;
        
        if (reportMatrix[subjectId] && usersWithoutAdmin.includes(user)) {
            reportMatrix[subjectId].users[user]++;
            subjectTotals[subjectId]++;
            userTotals[user]++;
            grandTotal++;
        }
    });
    
    // Filtrar apenas assuntos com atividade
    const reportData = Object.values(reportMatrix)
        .filter(subject => subjectTotals[subject.id] > 0)
        .map(subject => ({
            ...subject,
            total: subjectTotals[subject.id],
            percentage: grandTotal > 0 ? ((subjectTotals[subject.id] / grandTotal) * 100).toFixed(1) : '0.0'
        }));
    
    reportData.sort((a, b) => b.total - a.total);
    
    displayCompleteReport(reportData, userTotals, grandTotal, startDate, endDate, usersWithoutAdmin);
}

function displayCompleteReport(reportData, userTotals, grandTotal, startDate, endDate, usersWithoutAdmin) {
    // Atualizar cabeçalho
    const reportTitle = document.getElementById('report-title');
    const reportMeta = document.getElementById('report-meta');
    
    if (reportTitle) {
        reportTitle.textContent = 'Relatório Completo de Produtividade';
    }
    
    if (reportMeta) {
        reportMeta.innerHTML = `
            <p><strong>Período:</strong> ${formatDateBR(startDate)} a ${formatDateBR(endDate)}</p>
            <p><strong>Total de Entradas:</strong> ${grandTotal}</p>
            <p><strong>Relatório gerado por:</strong> ${currentUser}</p>
        `;
    }
    
    // Criar cabeçalho da tabela sem Admin
    const tableHead = document.getElementById('report-table-head');
    if (tableHead) {
        let headerHtml = '<tr><th style="text-align: left; min-width: 300px;">Assunto</th>';
        
        usersWithoutAdmin.forEach(user => {
            headerHtml += `<th style="text-align: center; min-width: 80px;">${user}</th>`;
        });
        
        headerHtml += '<th style="text-align: center; min-width: 80px;">TOTAL</th><th style="text-align: center; min-width: 60px;">%</th></tr>';
        
        tableHead.innerHTML = headerHtml;
    }
    
    // Preencher corpo da tabela sem Admin
    const tableBody = document.getElementById('report-table-body');
    if (tableBody) {
        tableBody.innerHTML = '';
        
        if (reportData.length === 0) {
            const colspan = usersWithoutAdmin.length + 3;
            tableBody.innerHTML = `
                <tr>
                    <td colspan="${colspan}" class="text-center">Nenhum registro encontrado no período.</td>
                </tr>
            `;
        } else {
            reportData.forEach(subject => {
                const row = document.createElement('tr');
                
                let rowHtml = `<td style="text-align: left; max-width: 300px; word-wrap: break-word;">${subject.text}</td>`;
                
                usersWithoutAdmin.forEach(user => {
                    const count = subject.users[user] || 0;
                    rowHtml += `<td style="text-align: center; ${count > 0 ? 'font-weight: bold;' : ''}">${count}</td>`;
                });
                
                rowHtml += `<td style="text-align: center; font-weight: bold;">${subject.total}</td>`;
                rowHtml += `<td style="text-align: center;">${subject.percentage}%</td>`;
                
                row.innerHTML = rowHtml;
                tableBody.appendChild(row);
            });
        }
    }
    
    // Rodapé da tabela (totais) sem Admin
    const tableFoot = document.getElementById('report-table-foot');
    if (tableFoot) {
        let footerHtml = '<tr style="background: var(--color-bg-6); font-weight: bold;"><th style="text-align: left;">TOTAL GERAL</th>';
        
        usersWithoutAdmin.forEach(user => {
            footerHtml += `<th style="text-align: center;">${userTotals[user]}</th>`;
        });
        
        footerHtml += `<th style="text-align: center;">${grandTotal}</th>`;
        footerHtml += '<th style="text-align: center;">100%</th></tr>';
        
        tableFoot.innerHTML = footerHtml;
    }
    
    // Aplicar classe específica para relatório administrativo
    const reportTable = document.getElementById('report-table');
    if (reportTable) {
        reportTable.classList.add('admin-report-table');
    }
    
    // Mostrar resultados
    document.getElementById('report-results').classList.remove('hidden');
    document.getElementById('report-summary').classList.add('hidden');
}

// Perfil
function setupProfile() {
    const passwordForm = document.getElementById('password-change-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }
}

function showProfileModal() {
    const modal = document.getElementById('profile-modal');
    const username = document.getElementById('profile-username');
    
    if (username) username.textContent = currentUser || 'Usuário';
    if (modal) modal.classList.remove('hidden');
}

import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

async function handlePasswordChange(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorDiv = document.getElementById('password-error');
    const submitBtn = e.target.querySelector('button[type=\"submit\"]');

    if (errorDiv) errorDiv.classList.add('hidden');

    if (newPassword !== confirmPassword) {
        showPasswordError('As senhas não coincidem.');
        return;
    }

    if (newPassword.length < 6) {
        showPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        const user = auth.currentUser;
        if (!user || !user.email) {
            showPasswordError('Usuário não autenticado.');
            return;
        }

        // Reautenticar usuário
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, newPassword);

        e.target.reset();
        hideProfileModal();
        showSuccessModal('Senha alterada com sucesso!');

        console.log('Senha alterada para:', user.email);

    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        if (error.code === 'auth/wrong-password') {
            showPasswordError('Senha atual incorreta.');
        } else if (error.code === 'auth/weak-password') {
            showPasswordError('A nova senha é muito fraca.');
        } else {
            showPasswordError('Erro ao alterar senha. Tente novamente.');
        }
    } finally {
        setButtonLoading(submitBtn, false);
    }
}


function hideProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.add('hidden');
    
    // Limpar formulário
    const form = document.getElementById('password-change-form');
    if (form) form.reset();
    
    const errorDiv = document.getElementById('password-error');
    if (errorDiv) errorDiv.classList.add('hidden');
}

// Modais
function setupModals() {
    // Fechar modais
    const closeModalBtn = document.getElementById('close-modal');
    const cancelProfileBtn = document.getElementById('cancel-profile');
    const cancelEditBtn = document.getElementById('cancel-edit');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideSuccessModal);
    }
    
    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', hideProfileModal);
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', hideEditModal);
    }
    
    // Fechar ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    });
    
    // Form de edição
    const editForm = document.getElementById('edit-entry-form');
    if (editForm) {
        editForm.addEventListener('submit', handleEditEntry);
    }
}

function showSuccessModal(message) {
    const modal = document.getElementById('success-modal');
    const messageEl = document.getElementById('success-message');
    
    if (messageEl) messageEl.textContent = message;
    if (modal) modal.classList.remove('hidden');
}

function hideSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.classList.add('hidden');
}

function showEditModal(entry) {
    const modal = document.getElementById('edit-modal');
    
    // Preencher campos
    document.getElementById('edit-entry-id').value = entry.id;
    document.getElementById('edit-subject-select').value = entry.subjectId;
    document.getElementById('edit-process-number').value = entry.processNumber || '';
    document.getElementById('edit-contributor').value = entry.contributor || '';
    document.getElementById('edit-ctm').value = entry.ctm || '';
    document.getElementById('edit-observation').value = entry.observation || '';
    document.getElementById('edit-habite-number').value = entry.habiteNumber || '';
    document.getElementById('edit-alvara-situation').value = entry.alvaraSituation || '';
    
    if (modal) modal.classList.remove('hidden');
}

function hideEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.add('hidden');
}

async function handleEditEntry(e) {
    e.preventDefault();
    
    const entryId = document.getElementById('edit-entry-id').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    const subjectId = parseInt(document.getElementById('edit-subject-select').value);
    const updatedEntry = {
        subjectId: subjectId,
        subjectText: GLUOS_DATA.assuntos.find(a => a.id === subjectId)?.texto || '',
        processNumber: document.getElementById('edit-process-number').value.trim(),
        contributor: document.getElementById('edit-contributor').value.trim(),
        ctm: document.getElementById('edit-ctm').value.trim(),
        observation: document.getElementById('edit-observation').value.trim(),
        habiteNumber: document.getElementById('edit-habite-number').value.trim(),
        alvaraSituation: document.getElementById('edit-alvara-situation').value.trim()
    };
    
    // Validação
    if (!updatedEntry.subjectId || !updatedEntry.processNumber) {
        alert('Por favor, preencha o assunto e o número do processo.');
        return;
    }
    
    setButtonLoading(submitBtn, true);
    
    try {
        if (firebaseConnected && database && !entryId.startsWith('local_')) {
            const entryRef = ref(database, `gluos_entries/${entryId}`);
            await update(entryRef, updatedEntry);
            console.log('Entrada atualizada no Firebase:', entryId);
        } else {
            // Atualizar localmente
            const entryIndex = allEntries.findIndex(e => e.id === entryId);
            if (entryIndex !== -1) {
                allEntries[entryIndex] = { ...allEntries[entryIndex], ...updatedEntry };
                console.log('Entrada atualizada localmente:', entryId);
            }
        }
        
        hideEditModal();
        showSuccessModal('Entrada atualizada com sucesso!');
        
    } catch (error) {
        console.error('Erro ao atualizar entrada:', error);
        alert('Erro ao atualizar entrada. Tente novamente.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Utilitários
function populateSelectOptions() {
    // Assuntos
    const subjectSelects = [
        'subject-select',
        'multi-subject-select',
        'edit-subject-select',
        'filter-subject',
        'subject1-select',
        'subject2-select',
        'subject3-select',
        'subject4-select',
        'subject5-select'
    ];
    
    subjectSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // Limpar opções existentes (exceto a primeira)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // Adicionar assuntos
            GLUOS_DATA.assuntos.forEach(assunto => {
                const option = document.createElement('option');
                option.value = assunto.id;
                option.textContent = `${assunto.id} - ${assunto.texto}`;
                select.appendChild(option);
            });
        }
    });
    
    // Servidores
    const serverSelects = [
        'search-server',
        'filter-server'
    ];
    
    serverSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            // Limpar opções existentes (exceto a primeira)
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // Adicionar usuários
            GLUOS_DATA.usuarios.forEach(user => {
                const option = document.createElement('option');
                option.value = user;
                option.textContent = user;
                select.appendChild(option);
            });
        }
    });
}

function showScreen(screenName) {
    console.log(`Mudando para tela: ${screenName}`);
    
    // Ocultar todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar tela alvo
    const targetScreen = document.getElementById(screenName + '-screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
        
        // Esconder formulário de relatório ao voltar para tela de relatórios
        if (screenName === 'report') {
            const reportForm = document.getElementById('report-form');
            const reportResults = document.getElementById('report-results');
            
            if (reportForm) reportForm.classList.add('hidden');
            if (reportResults) reportResults.classList.add('hidden');
            
            currentReportType = null;
        }
    } else {
        console.error('Tela não encontrada:', screenName + '-screen');
    }
}

function updateUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.textContent = currentUser ? `Usuário: ${currentUser}` : 'Bem-vindo!';
    }
}

function updateDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const datetimeInfo = document.getElementById('datetime-info');
    if (datetimeInfo) {
        datetimeInfo.textContent = dateTimeString;
    }
}

function updateFirebaseStatus(status, message) {
    const indicator = document.getElementById('firebase-indicator');
    const statusText = document.getElementById('firebase-status-text');
    
    if (indicator && statusText) {
        indicator.className = `status-indicator status-indicator--${status}`;
        statusText.textContent = message;
    }
    
    const syncIndicator = document.getElementById('sync-indicator');
    const syncText = document.getElementById('sync-status-text');
    
    if (syncIndicator && syncText) {
        syncIndicator.className = `status-indicator status-indicator--${status}`;
        syncText.textContent = status === 'success' ? 'Sincronizado' : 'Offline';
    }
}

function updateRecordCount() {
    const totalRecords = document.getElementById('total-records');
    if (totalRecords) {
        totalRecords.textContent = `${allEntries.length} registro(s)`;
    }
}

function formatDateBR(dateString) {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function setButtonLoading(button, loading) {
    if (!button) return;
    
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// NOTA: Este arquivo contém apenas as principais modificações.
// Para o arquivo completo, você deve copiar todo o conteúdo do arquivo original
// e substituir apenas as funções modificadas acima.

// ============================================
// SISTEMA DE PAGINAÇÃO PARA BASE DE DADOS
// ============================================

// Variáveis globais da paginação
let currentPage = 1;
let itemsPerPage = 500;
let currentEntries = [];
let totalPages = 1;

// Inicializar sistema de paginação
function initializePagination(entries) {
    currentEntries = entries;
    currentPage = 1;
    totalPages = Math.ceil(entries.length / itemsPerPage);

    // Atualizar display
    displayCurrentPage();
    updatePaginationControls();
    setupPaginationEventListeners();
}

// Exibir página atual
function displayCurrentPage() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageEntries = currentEntries.slice(startIndex, endIndex);

    const tableBody = document.querySelector('#database-table tbody');
    if (!tableBody) return;

    // Limpar tabela
    tableBody.innerHTML = '';

    // Preencher com entradas da página atual
    pageEntries.forEach(entry => {
        const row = document.createElement('tr');

        const canEdit = entry.server === currentUser;
        const actionsHtml = canEdit ? `
            <div class="action-buttons">
                <button class="btn--edit" onclick="editEntry('${entry.id}')">Editar</button>
                <button class="btn--delete" onclick="deleteEntry('${entry.id}')">Excluir</button>
            </div>
        ` : '-';

        row.innerHTML = `
            <td>${entry.date || '-'}</td>
            <td>${entry.time || '-'}</td>
            <td>${entry.server || '-'}</td>
            <td>${entry.processNumber || '-'}</td>
            <td title="${entry.subjectText || '-'}">${truncateText(entry.subjectText || '-', 30)}</td>
            <td>${entry.contributor || '-'}</td>
            <td>${entry.ctm || '-'}</td>
            <td title="${entry.observation || '-'}">${truncateText(entry.observation || '-', 40)}</td>
            <td>${actionsHtml}</td>
        `;
        tableBody.appendChild(row);
    });

    // Atualizar informações de paginação
    updatePaginationInfo();
}

// Atualizar informações de paginação
function updatePaginationInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, currentEntries.length);
    const totalEntries = currentEntries.length;

    const infoText = `Mostrando ${startIndex}-${endIndex} de ${totalEntries} registros`;

    // Atualizar ambos os elementos de informação (superior e inferior)
    const infoElements = [
        document.getElementById('pagination-info-text'),
        document.getElementById('pagination-info-text-bottom')
    ];

    infoElements.forEach(element => {
        if (element) {
            element.textContent = infoText;
        }
    });
}

// Atualizar controles de paginação
function updatePaginationControls() {
    if (totalPages <= 1) {
        hidePaginationControls();
        return;
    }

    showPaginationControls();

    // Atualizar botões de navegação
    updateNavigationButtons();

    // Atualizar números das páginas
    updatePageNumbers();
}

// Mostrar controles de paginação
function showPaginationControls() {
    const containers = document.querySelectorAll('.pagination-container');
    containers.forEach(container => {
        if (container) {
            container.style.display = 'flex';
        }
    });
}

// Esconder controles de paginação
function hidePaginationControls() {
    const containers = document.querySelectorAll('.pagination-container');
    containers.forEach(container => {
        if (container) {
            container.style.display = 'none';
        }
    });
}

// Atualizar botões de navegação
function updateNavigationButtons() {
    const navigationButtons = [
        { ids: ['first-page-btn', 'first-page-btn-bottom'], condition: currentPage === 1 },
        { ids: ['prev-page-btn', 'prev-page-btn-bottom'], condition: currentPage === 1 },
        { ids: ['next-page-btn', 'next-page-btn-bottom'], condition: currentPage === totalPages },
        { ids: ['last-page-btn', 'last-page-btn-bottom'], condition: currentPage === totalPages }
    ];

    navigationButtons.forEach(buttonGroup => {
        buttonGroup.ids.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.disabled = buttonGroup.condition;
            }
        });
    });
}

// Atualizar números das páginas
function updatePageNumbers() {
    const pageNumberContainers = [
        document.getElementById('page-numbers-top'),
        document.getElementById('page-numbers-bottom')
    ];

    pageNumberContainers.forEach(container => {
        if (container) {
            container.innerHTML = generatePageNumbers();
        }
    });
}

// Gerar HTML dos números das páginas
function generatePageNumbers() {
    let html = '';

    // Mostrar páginas 1-15, depois reticências e botões de navegação
    const maxVisiblePages = 15;

    if (totalPages <= maxVisiblePages) {
        // Mostrar todas as páginas se forem 15 ou menos
        for (let i = 1; i <= totalPages; i++) {
            html += createPageButton(i);
        }
    } else {
        // Lógica mais complexa para muitas páginas
        if (currentPage <= 10) {
            // Início: mostrar 1-15
            for (let i = 1; i <= 15; i++) {
                html += createPageButton(i);
            }
            if (totalPages > 15) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
        } else if (currentPage > totalPages - 10) {
            // Fim: mostrar últimas 15 páginas
            if (totalPages > 15) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
            for (let i = Math.max(1, totalPages - 14); i <= totalPages; i++) {
                html += createPageButton(i);
            }
        } else {
            // Meio: mostrar contexto ao redor da página atual
            html += createPageButton(1);
            html += '<span class="pagination-ellipsis">...</span>';

            const start = Math.max(2, currentPage - 7);
            const end = Math.min(totalPages - 1, currentPage + 7);

            for (let i = start; i <= end; i++) {
                html += createPageButton(i);
            }

            html += '<span class="pagination-ellipsis">...</span>';
            html += createPageButton(totalPages);
        }
    }

    return html;
}

// Criar botão de página
function createPageButton(pageNumber) {
    const isActive = pageNumber === currentPage;
    const activeClass = isActive ? ' active' : '';

    return `<button class="page-number-btn${activeClass}" onclick="goToPage(${pageNumber})">${pageNumber}</button>`;
}

// Navegar para página específica
function goToPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > totalPages || pageNumber === currentPage) {
        return;
    }

    currentPage = pageNumber;
    displayCurrentPage();
    updatePaginationControls();

    // Scroll para o topo da tabela
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Navegação por botões
function goToFirstPage() {
    goToPage(1);
}

function goToPrevPage() {
    goToPage(currentPage - 1);
}

function goToNextPage() {
    goToPage(currentPage + 1);
}

function goToLastPage() {
    goToPage(totalPages);
}

// Configurar event listeners da paginação
function setupPaginationEventListeners() {
    // Botões primeira/última/anterior/próxima (superior e inferior)
    const paginationButtons = [
        { ids: ['first-page-btn', 'first-page-btn-bottom'], handler: goToFirstPage },
        { ids: ['prev-page-btn', 'prev-page-btn-bottom'], handler: goToPrevPage },
        { ids: ['next-page-btn', 'next-page-btn-bottom'], handler: goToNextPage },
        { ids: ['last-page-btn', 'last-page-btn-bottom'], handler: goToLastPage }
    ];

    paginationButtons.forEach(buttonGroup => {
        buttonGroup.ids.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                // Remover listeners antigos
                button.removeEventListener('click', buttonGroup.handler);
                // Adicionar novo listener
                button.addEventListener('click', buttonGroup.handler);
            }
        });
    });
}

// Modificar a função setupDatabase para incluir a paginação


    if (clearBtn) {
        clearBtn.addEventListener('click', clearDatabaseFilters);
    }

    // Configurar paginação
    setupPaginationEventListeners();

// ================================
// FUNCIONALIDADE VÁRIOS NOVOS
// ================================

// Setup para funcionalidade Vários Novos
function setupBulkEntries() {
    const generateBtn = document.getElementById('generate-bulk-forms');
    const saveAllBtn = document.getElementById('save-all-bulk');
    const resetBtn = document.getElementById('reset-bulk-forms');
    const bulkSubjectNumber = document.getElementById('bulk-subject-number');
    const bulkSubjectSelect = document.getElementById('bulk-subject-select');

if (bulkSubjectSelect) {
  // Limpa antes de popular
  bulkSubjectSelect.innerHTML = '<option value="">Selecione um assunto...</option>';
  GLUOS_DATA.assuntos.forEach(assunto => {
    const opt = document.createElement('option');
    opt.value = assunto.id;
    opt.textContent = `${assunto.id} - ${assunto.texto}`;
    bulkSubjectSelect.appendChild(opt);
  });
}

    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateBulkForms);
    }

    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', handleSaveAllBulkEntries);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', handleResetBulkForms);
    }

    // Auto-preencher assunto pelo número
    if (bulkSubjectNumber && bulkSubjectSelect) {
        bulkSubjectNumber.addEventListener('input', function() {
            const num = parseInt(this.value);
            if (num >= 1 && num <= 50) {
                const assunto = GLUOS_DATA.assuntos.find(a => a.id === num);
                if (assunto) {
                    bulkSubjectSelect.value = assunto.id;
                }
            }
        });

        // Sincronizar select com número
        bulkSubjectSelect.addEventListener('change', function() {
            if (this.value) {
                bulkSubjectNumber.value = this.value;
            }
        });
    }
}

// Gerar formulários em massa
function handleGenerateBulkForms() {
    const subjectId = parseInt(document.getElementById('bulk-subject-select').value);
    const quantity = parseInt(document.getElementById('bulk-quantity').value);

    if (!subjectId) {
        alert('Por favor, selecione um assunto.');
        return;
    }

    if (!quantity || quantity < 1 || quantity > 10) {
        alert('Por favor, informe uma quantidade válida (1-10).');
        return;
    }

    const assunto = GLUOS_DATA.assuntos.find(a => a.id === subjectId);
    if (!assunto) {
        alert('Assunto não encontrado.');
        return;
    }

    // Mostrar container dos formulários
    const container = document.getElementById('bulk-forms-container');
    const subjectText = document.getElementById('bulk-selected-subject-text');
    const processesContainer = document.getElementById('bulk-processes-container');

    if (container && subjectText && processesContainer && assunto) {
        subjectText.textContent = assunto.texto;
        container.classList.remove('hidden');

        // Limpar formulários anteriores
        processesContainer.innerHTML = '';

        // Gerar os formulários
        for (let i = 1; i <= quantity; i++) {
            const processForm = createBulkProcessForm(i);
            processesContainer.appendChild(processForm);
        }

        console.log(`Gerados ${quantity} formulários para o assunto: ${assunto.texto}`);
    }
}

// Criar formulário individual para processo
function createBulkProcessForm(processNumber) {
    const formDiv = document.createElement('div');
    formDiv.className = 'bulk-process-form';
    formDiv.setAttribute('data-process-number', processNumber);

    formDiv.innerHTML = `
        <div class="process-form-header">
            <h4>Processo ${processNumber}</h4>
            <button type="button" class="btn btn--sm btn--secondary expand-process-btn" data-process="${processNumber}">
                + Campos Opcionais
            </button>
        </div>

        <div class="form-group">
            <label for="bulk-process-${processNumber}">Nº do Processo/Protocolo:</label>
            <input type="text" id="bulk-process-${processNumber}" class="form-control bulk-process-input" 
                   placeholder="Digite o número do processo" data-process="${processNumber}">
        </div>

        <div class="optional-fields hidden" id="optional-fields-${processNumber}">
            <div class="form-row">
                <div class="form-group">
                    <label for="bulk-contributor-${processNumber}">Contribuinte:</label>
                    <input type="text" id="bulk-contributor-${processNumber}" class="form-control" 
                           placeholder="Nome do contribuinte">
                </div>
                <div class="form-group">
                    <label for="bulk-ctm-${processNumber}">CTM:</label>
                    <input type="text" id="bulk-ctm-${processNumber}" class="form-control" 
                           placeholder="CTM do processo">
                </div>
            </div>

            <div class="form-group">
                <label for="bulk-observation-${processNumber}">Observação:</label>
                <textarea id="bulk-observation-${processNumber}" class="form-control" 
                          rows="2" placeholder="Observações sobre o processo"></textarea>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="bulk-habite-${processNumber}">Número do Habite-se/Alvará:</label>
                    <input type="text" id="bulk-habite-${processNumber}" class="form-control" 
                           placeholder="Número do habite-se ou alvará">
                </div>
                <div class="form-group">
                    <label for="bulk-alvara-situation-${processNumber}">Situação do Alvará de Funcionamento:</label>
                    <select id="bulk-alvara-situation-${processNumber}" class="form-control">
                        <option value="">Selecione uma situação...</option>
                        <option value="Deferido">Deferido</option>
                        <option value="Indeferido">Indeferido</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Em análise">Em análise</option>
                        <option value="Aguardando documentação">Aguardando documentação</option>
                    </select>
                </div>
            </div>
        </div>
    `;

    // Adicionar event listener para expandir campos opcionais
    const expandBtn = formDiv.querySelector('.expand-process-btn');
    const optionalFields = formDiv.querySelector('.optional-fields');
    const processInput = formDiv.querySelector('.bulk-process-input');

    if (expandBtn && optionalFields) {
        expandBtn.addEventListener('click', function() {
            const isHidden = optionalFields.classList.contains('hidden');
            if (isHidden) {
                optionalFields.classList.remove('hidden');
                expandBtn.textContent = '- Campos Opcionais';
                expandBtn.classList.remove('btn--secondary');
                expandBtn.classList.add('btn--warning');
            } else {
                optionalFields.classList.add('hidden');
                expandBtn.textContent = '+ Campos Opcionais';
                expandBtn.classList.remove('btn--warning');
                expandBtn.classList.add('btn--secondary');
            }
        });
    }

    // Adicionar autopreenchimento baseado no número do processo
    if (processInput) {
        processInput.addEventListener('input', async function() {
            let numeroProcesso = this.value.trim();
            numeroProcesso = numeroProcesso.replace(/\//g, "-");

            const contributorInput = formDiv.querySelector(`#bulk-contributor-${processNumber}`);
            const ctmInput = formDiv.querySelector(`#bulk-ctm-${processNumber}`);

            if (!numeroProcesso) {
                if (contributorInput) contributorInput.value = '';
                if (ctmInput) ctmInput.value = '';
                return;
            }

            try {
                if (processosDatabase) {
                    const refProc = ref(processosDatabase, 'processos/' + numeroProcesso);
                    const snapshot = await get(refProc);

                    if (snapshot.exists()) {
                        const dados = snapshot.val();
                        if (contributorInput) contributorInput.value = dados.Requerente || '';
                        if (ctmInput) ctmInput.value = dados.CTM || '';
                    } else {
                        if (contributorInput) contributorInput.value = '';
                        if (ctmInput) ctmInput.value = '';
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar processo:', err);
                if (contributorInput) contributorInput.value = '';
                if (ctmInput) ctmInput.value = '';
            }
        });
    }

    return formDiv;
}

// Salvar todas as entradas em massa
async function handleSaveAllBulkEntries() {
    const subjectId = parseInt(document.getElementById('bulk-subject-select').value);
    const assunto = GLUOS_DATA.assuntos.find(a => a.id === subjectId);

    if (!subjectId || !assunto) {
        alert('Erro: Assunto não selecionado.');
        return;
    }

    const processesContainer = document.getElementById('bulk-processes-container');
    const processForms = processesContainer.querySelectorAll('.bulk-process-form');

    const entriesToSave = [];
    let firstProcessFilled = false;

    // Validar e coletar dados
    for (let i = 0; i < processForms.length; i++) {
        const form = processForms[i];
        const processNumber = form.getAttribute('data-process-number');
        const processInput = form.querySelector(`#bulk-process-${processNumber}`);

        if (!processInput) continue;

        const processValue = processInput.value.trim();

        // Se é o primeiro processo, deve estar preenchido
        if (i === 0 && !processValue) {
            alert('O primeiro processo deve ser preenchido.');
            processInput.focus();
            return;
        }

        // Se o primeiro está preenchido, marcar flag
        if (i === 0 && processValue) {
            firstProcessFilled = true;
        }

        // Se tem valor no processo, coletar todos os dados
        if (processValue) {
            const now = new Date();
            const entry = {
                subjectId: subjectId,
                subjectText: assunto.texto,
                processNumber: processValue,
                contributor: form.querySelector(`#bulk-contributor-${processNumber}`)?.value.trim() || '',
                ctm: form.querySelector(`#bulk-ctm-${processNumber}`)?.value.trim() || '',
                observation: form.querySelector(`#bulk-observation-${processNumber}`)?.value.trim() || '',
                habiteNumber: form.querySelector(`#bulk-habite-${processNumber}`)?.value.trim() || '',
                alvaraSituation: form.querySelector(`#bulk-alvara-situation-${processNumber}`)?.value.trim() || '',
                server: currentUser,
                date: now.toLocaleDateString('pt-BR'),
                time: now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
                timestamp: now.getTime()
            };

            entriesToSave.push(entry);
        }
    }

    if (!firstProcessFilled) {
        alert('Pelo menos o primeiro processo deve ser preenchido.');
        return;
    }

    if (entriesToSave.length === 0) {
        alert('Nenhum processo foi preenchido.');
        return;
    }

    // Confirmar salvamento
    const confirmMessage = `Deseja salvar ${entriesToSave.length} entrada(s) para o assunto "${assunto.texto}"?`;
    if (!confirm(confirmMessage)) {
        return;
    }

    const saveBtn = document.getElementById('save-all-bulk');
    setButtonLoading(saveBtn, true);

    try {
        // Salvar cada entrada
        for (const entry of entriesToSave) {
            if (firebaseConnected && database) {
                const entriesRef = ref(database, 'gluos_entries');
                await push(entriesRef, entry);
            } else {
                // Salvar localmente se Firebase não estiver disponível
                entry.id = 'local_' + Date.now() + '_' + Math.random();
                allEntries.unshift(entry);
            }
        }

        console.log(`${entriesToSave.length} entradas salvas com sucesso`);
        showSuccessModal(`${entriesToSave.length} entrada(s) salva(s) com sucesso!`);

        // Limpar formulários após salvamento
        handleResetBulkForms();

    } catch (error) {
        console.error('Erro ao salvar entradas em massa:', error);
        alert('Erro ao salvar as entradas. Tente novamente.');
    } finally {
        setButtonLoading(saveBtn, false);
    }
}

// Resetar formulários
function handleResetBulkForms() {
    const container = document.getElementById('bulk-forms-container');
    const processesContainer = document.getElementById('bulk-processes-container');

    if (container) {
        container.classList.add('hidden');
    }

    if (processesContainer) {
        processesContainer.innerHTML = '';
    }

    // Limpar campos de seleção
    document.getElementById('bulk-subject-number').value = '';
    document.getElementById('bulk-subject-select').value = '';
    document.getElementById('bulk-quantity').value = '5';

    console.log('Formulários de entrada em massa resetados');
}

// ============================================================================
// NOVO: VÁRIOS ASSUNTOS - Funcionalidades
// ============================================================================

// Setup para Novo: Vários assuntos
function setupMultiSubjectEntries() {
    const form = document.getElementById('multi-subject-form');
    const processNumberInput = document.getElementById('multi-process-number');
    const contributorInput = document.getElementById('multi-contributor');
    const ctmInput = document.getElementById('multi-ctm');

    if (form) {
        form.addEventListener('submit', handleMultiSubjectSubmit);
    }

    // Autopreenchimento baseado no número do processo
    if (processNumberInput && contributorInput && ctmInput) {
        processNumberInput.addEventListener('input', async function() {
            let numeroProcesso = this.value.trim();
            numeroProcesso = numeroProcesso.replace(/\//g, "-");

            if (!numeroProcesso) {
                contributorInput.value = '';
                ctmInput.value = '';
                return;
            }

            try {
                if (processosDatabase) {
                    const refProc = ref(processosDatabase, 'processos/' + numeroProcesso);
                    const snapshot = await get(refProc);

                    if (snapshot.exists()) {
                        const dados = snapshot.val();
                        contributorInput.value = dados.Requerente || '';
                        ctmInput.value = dados.CTM || '';
                    } else {
                        contributorInput.value = '';
                        ctmInput.value = '';
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar processo:', err);
                contributorInput.value = '';
                ctmInput.value = '';
            }
        });
    }

    // Configurar os pares de ID e Select para os 5 assuntos
    for (let i = 1; i <= 5; i++) {
        setupSubjectPair(i);
    }

    // Popular os selects de assunto
    populateMultiSubjectSelects();
}

function setupSubjectPair(index) {
    const idInput = document.getElementById(`subject${index}-id`);
    const selectInput = document.getElementById(`subject${index}-select`);

    if (idInput && selectInput) {
        // Quando o ID é digitado, atualizar o select
        idInput.addEventListener('input', function() {
            const num = parseInt(this.value);
            if (num >= 1 && num <= 50) {
                const assunto = GLUOS_DATA.assuntos.find(a => a.id === num);
                if (assunto) {
                    selectInput.value = assunto.id;
                }
            } else if (!this.value) {
                selectInput.value = '';
            }
        });

        // Quando o select é escolhido, atualizar o ID
        selectInput.addEventListener('change', function() {
            if (this.value) {
                idInput.value = this.value;
            } else {
                idInput.value = '';
            }
        });
    }
}

function populateMultiSubjectSelects() {
    for (let i = 1; i <= 5; i++) {
        const select = document.getElementById(`subject${i}-select`);
        if (select && select.options.length <= 1) {
            // Limpar opções existentes exceto a primeira
            while (select.options.length > 1) {
                select.removeChild(select.lastChild);
            }

            // Adicionar todas as opções de assunto
            GLUOS_DATA.assuntos.forEach(assunto => {
                const option = document.createElement('option');
                option.value = assunto.id;
                option.textContent = `${assunto.id} - ${assunto.texto}`;
                select.appendChild(option);
            });
        }
    }
}

async function handleMultiSubjectSubmit(e) {
    e.preventDefault();
    console.log('Processando múltiplas entradas de assuntos...');

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Coletar dados principais
    const processNumber = document.getElementById('multi-process-number').value.trim();
    const contributor = document.getElementById('multi-contributor').value.trim();
    const ctm = document.getElementById('multi-ctm').value.trim();
    const observation = document.getElementById('multi-observation').value.trim();
    const habiteNumber = document.getElementById('multi-habite-number').value.trim();
    const alvaraSituation = document.getElementById('multi-alvara-situation').value.trim();

    if (!processNumber) {
        alert('Por favor, informe o número do processo.');
        return;
    }

    // Coletar assuntos selecionados
    const selectedSubjects = [];
    for (let i = 1; i <= 5; i++) {
        const subjectId = parseInt(document.getElementById(`subject${i}-select`).value);
        if (subjectId) {
            const assunto = GLUOS_DATA.assuntos.find(a => a.id === subjectId);
            if (assunto) {
                selectedSubjects.push({
                    id: subjectId,
                    text: assunto.texto
                });
            }
        }
    }

    if (selectedSubjects.length === 0) {
        alert('Por favor, selecione pelo menos um assunto.');
        return;
    }

    setButtonLoading(submitBtn, true);

    try {
        const now = new Date();
        const savedEntries = [];

        // Criar uma entrada para cada assunto selecionado
        for (const subject of selectedSubjects) {
            const entry = {
                subjectId: subject.id,
                subjectText: subject.text,
                processNumber: processNumber,
                contributor: contributor,
                ctm: ctm,
                observation: observation,
                habiteNumber: habiteNumber,
                alvaraSituation: alvaraSituation,
                server: currentUser,
                date: now.toLocaleDateString('pt-BR'),
                time: now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
                timestamp: now.getTime()
            };

            // Salvar no Firebase se conectado
            if (firebaseConnected && database) {
                const entriesRef = ref(database, 'gluos_entries');
                await push(entriesRef, entry);
                console.log('Entrada salva no Firebase:', entry);
            } else {
                // Salvar localmente se Firebase não estiver disponível
                entry.id = 'local_' + Date.now() + '_' + subject.id;
                allEntries.unshift(entry);
                console.log('Entrada salva localmente:', entry);
            }

            savedEntries.push(entry);
        }

        // Limpar formulário
        form.reset();

        // Limpar os campos de ID também
        for (let i = 1; i <= 5; i++) {
            document.getElementById(`subject${i}-id`).value = '';
        }

        // Mostrar sucesso
        const message = `${savedEntries.length} entradas salvas com sucesso!\n\nAssuntos cadastrados:\n${savedEntries.map(e => `- ${e.subjectText}`).join('\n')}`;
        showSuccessModal(message);

    } catch (error) {
        console.error('Erro ao salvar entradas:', error);
        alert('Erro ao salvar entradas. Tente novamente.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}
