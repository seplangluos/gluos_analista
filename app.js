// Sistema GLUOS - Gerência de Licenciamento de Uso e Ocupação do Solo
// Integração completa com Firebase - Versão com Firebase Authentication
// Importações do Firebase v9+
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getDatabase, ref, push, set, get, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js';
import { getAuth, signInWithEmailAndPassword, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

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
  "Fernanda": "fernanda@hotmail.com",
  "João": "joão@hotmail.com",
  "Admin": "seplan.gluos@valadares.mg.gov.br"
};

// Função para converter email para nome de usuário
function emailToUsername(email) {
  for (const [username, userEmail] of Object.entries(USER_EMAIL_MAPPING)) {
    if (userEmail === email) {
      return username;
    }
  }
  return email;
}

// Dados da aplicação
const GLUOS_DATA = {
  usuarios: ["Pedro", "Rogério", "Isadora", "Andreza", "Hélica", "Juliana", "Frederico", "Gabriella", "Renata", "Ana Luiza", "Maysa", "Marcella", "Lúcia", "Fernanda", "João", "Admin"],
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
    {id: 10, texto: "Conformidade/Antena"},
    {id: 11, texto: "Declarações"},
  ]
};

// Estado global
let currentUser = null;
let allEntries = [];
let processCounter = 1;
let currentReportType = null;
let firebaseConnected = false;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
  console.log('Sistema GLUOS iniciando...');
  
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
    userSelect.style.zIndex = '1000';
    userSelect.style.pointerEvents = 'auto';
    userSelect.style.position = 'relative';
    
    userSelect.addEventListener('change', function() {
      console.log('Usuário selecionado:', this.value);
    });
    
    userSelect.addEventListener('click', function() {
      console.log('Select clicado');
      this.focus();
    });
    
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
      return;
    }
    
    const testRef = ref(database, '.info/connected');
    onValue(testRef, (snapshot) => {
      firebaseConnected = snapshot.val() === true;
      if (firebaseConnected) {
        updateFirebaseStatus('success', 'Conectado ao Firebase');
        loadAllEntries();
      } else {
        updateFirebaseStatus('error', 'Desconectado do Firebase');
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
        allEntries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      } else {
        allEntries = [];
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
  const loginForm = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');
  const userSelect = document.getElementById('user-select');
  const passwordInput = document.getElementById('password');
  
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (loginBtn) {
    loginBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleLogin(e);
    });
  }
  
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
  
  setupMainNavigation();
  setupNewEntry();
  setupBulkEntries();
  setupMultiSubjectEntries();
  setupSearch();
  setupDatabase();
  setupReports();
  setupProfile();
  setupModals();
}

function setupMainNavigation() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  
  const navButtons = [
    { id: 'new-entry-btn', screen: 'new-entry' },
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
        if (btn.screen) showScreen(btn.screen);
        if (btn.callback) btn.callback();
      });
    }
  });
  
  const backButtons = [
    'back-to-dashboard-1', 'back-to-dashboard-3', 
    'back-to-dashboard-4', 'back-to-dashboard-5',
    'back-to-dashboard-6', 'back-to-dashboard-7'
  ];
  
  backButtons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', () => showScreen('dashboard'));
  });
}

async function handleLogin(e) {
  e.preventDefault();

  const userSelect = document.getElementById('user-select');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  if (!userSelect || !passwordInput) return;

  const user = userSelect.value?.trim();
  const password = passwordInput.value?.trim();

  if (loginError) {
    loginError.classList.add('hidden');
    loginError.textContent = '';
  }

  if (!user) return showLoginError('Por favor, selecione um usuário.');
  if (!password) return showLoginError('Por favor, digite sua senha.');

  const userEmail = USER_EMAIL_MAPPING[user];
  if (!userEmail) return showLoginError('Usuário não encontrado.');

  setButtonLoading(loginBtn, true);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
    const firebaseUser = userCredential.user;
    
    currentUser = user; 
    updateUserInfo();

    userSelect.value = '';
    passwordInput.value = '';

    showScreen('dashboard');

  } catch (error) {
    if (error.code === 'auth/user-not-found') showLoginError('Usuário não encontrado no sistema.');
    else if (error.code === 'auth/wrong-password') showLoginError('Senha incorreta.');
    else if (error.code === 'auth/invalid-email') showLoginError('Email inválido.');
    else if (error.code === 'auth/too-many-requests') showLoginError('Muitas tentativas. Tente novamente mais tarde.');
    else showLoginError('Usuário ou senha inválidos.');
  } finally {
    setButtonLoading(loginBtn, false);
  }
}

function showLoginError(message) {
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
}

// Nova entrada
function setupNewEntry() {
  const form = document.getElementById('new-entry-form');
  const subjectNumber = document.getElementById('subject-number');
  const subjectSelect = document.getElementById('subject-select');
  
  const processNumberInput = document.getElementById('process-number');
  const assuntoProcessoInput = document.getElementById('assunto-processo');
  const contributorInput = document.getElementById('contributor');
  const ctmInput = document.getElementById('ctm');

  if (form) form.addEventListener('submit', handleNewEntry);

  if (subjectNumber && subjectSelect) {
    subjectNumber.addEventListener('input', function() {
      const num = parseInt(this.value);
      if (num >= 1 && num <= 50) {
        const assunto = GLUOS_DATA.assuntos.find(a => a.id === num);
        if (assunto) subjectSelect.value = assunto.id;
      }
    });

    subjectSelect.addEventListener('change', function() {
      if (this.value) subjectNumber.value = this.value;
    });
  }

  // Autopreenchimento baseado no número do processo (incluindo Assunto Processo)
  if(processNumberInput) {
	processNumberInput.addEventListener('input', async function () {
   	let numeroProcesso = this.value.trim();
   	numeroProcesso = numeroProcesso.replace(/\//g, "-");
   	if (!numeroProcesso) {
        if(contributorInput) contributorInput.value = '';
        if(ctmInput) ctmInput.value = '';
        if(assuntoProcessoInput) assuntoProcessoInput.value = '';
        return;
    }

      try {
        if (processosDatabase) {
          const refProc = ref(processosDatabase, 'processos/' + numeroProcesso);
          const snapshot = await get(refProc);
          if (snapshot.exists()) {
            const dados = snapshot.val();
            if(contributorInput) contributorInput.value = dados.Requerente || '';
            if(ctmInput) ctmInput.value = dados.CTM || '';
            if(assuntoProcessoInput) assuntoProcessoInput.value = dados.Assunto || '';
          } else {
            if(contributorInput) contributorInput.value = '';
            if(ctmInput) ctmInput.value = '';
            if(assuntoProcessoInput) assuntoProcessoInput.value = '';
          }
        }
      } catch (err) {
        console.error('Erro ao buscar processo:', err);
        if(contributorInput) contributorInput.value = '';
        if(ctmInput) ctmInput.value = '';
        if(assuntoProcessoInput) assuntoProcessoInput.value = '';
      }
    });
  }
}

async function handleNewEntry(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const subjectId = parseInt(document.getElementById('subject-select').value);
  const processNumber = document.getElementById('process-number').value.trim();

  if (!subjectId) return alert('Por favor, selecione um assunto.');
  if (!processNumber) return alert('Por favor, informe o número do processo.');

  const assunto = GLUOS_DATA.assuntos.find(a => a.id === subjectId);
  const now = new Date();

  const entry = {
    subjectId: subjectId,
    subjectText: assunto ? assunto.texto : '',
    processNumber: processNumber,
    assuntoProcesso: document.getElementById('assunto-processo')?.value.trim() || '',
    contributor: document.getElementById('contributor').value.trim(),
    ctm: document.getElementById('ctm').value.trim(),
    observation: document.getElementById('observation').value.trim(),
    prazo: document.getElementById('prazo')?.value.trim() || '',
    alvaraSituation: document.getElementById('alvara-situation').value.trim(),
    server: currentUser,
    date: now.toLocaleDateString('pt-BR'),
    time: now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
    timestamp: now.getTime()
  };

  setButtonLoading(submitBtn, true);

  try {
    if (firebaseConnected && database) {
      const entriesRef = ref(database, 'gluos_entries');
      await push(entriesRef, entry);
    } else {
      entry.id = 'local_' + Date.now();
      allEntries.unshift(entry);
    }
    form.reset();
    document.getElementById('subject-number').value = '';
    showSuccessModal('Entrada salva com sucesso!');
  } catch (error) {
    alert('Erro ao salvar entrada. Tente novamente.');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

// Setup para funcionalidade Vários Novos
function setupBulkEntries() {
    const generateBtn = document.getElementById('generate-bulk-forms');
    const saveAllBtn = document.getElementById('save-all-bulk');
    const resetBtn = document.getElementById('reset-bulk-forms');
    const bulkSubjectNumber = document.getElementById('bulk-subject-number');
    const bulkSubjectSelect = document.getElementById('bulk-subject-select');

    if (bulkSubjectSelect) {
        bulkSubjectSelect.innerHTML = '<option value="">Selecione um assunto...</option>';
        GLUOS_DATA.assuntos.forEach(assunto => {
            const opt = document.createElement('option');
            opt.value = assunto.id;
            opt.textContent = `${assunto.id} - ${assunto.texto}`;
            bulkSubjectSelect.appendChild(opt);
        });
    }

    if (generateBtn) generateBtn.addEventListener('click', handleGenerateBulkForms);
    if (saveAllBtn) saveAllBtn.addEventListener('click', handleSaveAllBulkEntries);
    if (resetBtn) resetBtn.addEventListener('click', handleResetBulkForms);

    if (bulkSubjectNumber && bulkSubjectSelect) {
        bulkSubjectNumber.addEventListener('input', function() {
            const num = parseInt(this.value);
            if (num >= 1 && num <= 50) {
                const assunto = GLUOS_DATA.assuntos.find(a => a.id === num);
                if (assunto) bulkSubjectSelect.value = assunto.id;
            }
        });

        bulkSubjectSelect.addEventListener('change', function() {
            if (this.value) bulkSubjectNumber.value = this.value;
        });
    }
}

function handleGenerateBulkForms() {
    const subjectId = parseInt(document.getElementById('bulk-subject-select').value);
    const quantity = parseInt(document.getElementById('bulk-quantity').value);

    if (!subjectId) return alert('Por favor, selecione um assunto.');
    if (!quantity || quantity < 1 || quantity > 10) return alert('Por favor, informe uma quantidade válida (1-10).');

    const assunto = GLUOS_DATA.assuntos.find(a => a.id === subjectId);
    if (!assunto) return alert('Assunto não encontrado.');

    const container = document.getElementById('bulk-forms-container');
    const subjectText = document.getElementById('bulk-selected-subject-text');
    const processesContainer = document.getElementById('bulk-processes-container');

    if (container && subjectText && processesContainer && assunto) {
        subjectText.textContent = assunto.texto;
        container.classList.remove('hidden');
        processesContainer.innerHTML = '';

        for (let i = 1; i <= quantity; i++) {
            const processForm = createBulkProcessForm(i);
            processesContainer.appendChild(processForm);
        }
    }
}

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
            <div class="form-group">
                <label for="bulk-assunto-processo-${processNumber}">Assunto Processo:</label>
                <input type="text" id="bulk-assunto-processo-${processNumber}" class="form-control" 
                       placeholder="Assunto do Processo">
            </div>
            
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
                    <label for="bulk-prazo-${processNumber}">Prazo (em dias):</label>
                    <input type="number" id="bulk-prazo-${processNumber}" class="form-control" 
                           placeholder="Prazo opcional">
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

    if (processInput) {
        processInput.addEventListener('input', async function() {
            let numeroProcesso = this.value.trim();
            numeroProcesso = numeroProcesso.replace(/\//g, "-");

            const assuntoProcessoInput = formDiv.querySelector(`#bulk-assunto-processo-${processNumber}`);
            const contributorInput = formDiv.querySelector(`#bulk-contributor-${processNumber}`);
            const ctmInput = formDiv.querySelector(`#bulk-ctm-${processNumber}`);

            if (!numeroProcesso) {
                if (contributorInput) contributorInput.value = '';
                if (ctmInput) ctmInput.value = '';
                if (assuntoProcessoInput) assuntoProcessoInput.value = '';
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
                        if (assuntoProcessoInput) assuntoProcessoInput.value = dados.Assunto || '';
                    } else {
                        if (contributorInput) contributorInput.value = '';
                        if (ctmInput) ctmInput.value = '';
                        if (assuntoProcessoInput) assuntoProcessoInput.value = '';
                    }
                }
            } catch (err) {
                if (contributorInput) contributorInput.value = '';
                if (ctmInput) ctmInput.value = '';
                if (assuntoProcessoInput) assuntoProcessoInput.value = '';
            }
        });
    }

    return formDiv;
}

async function handleSaveAllBulkEntries() {
    const subjectId = parseInt(document.getElementById('bulk-subject-select').value);
    const assunto = GLUOS_DATA.assuntos.find(a => a.id === subjectId);

    if (!subjectId || !assunto) return alert('Erro: Assunto não selecionado.');

    const processesContainer = document.getElementById('bulk-processes-container');
    const processForms = processesContainer.querySelectorAll('.bulk-process-form');

    const entriesToSave = [];
    let firstProcessFilled = false;

    for (let i = 0; i < processForms.length; i++) {
        const form = processForms[i];
        const processNumber = form.getAttribute('data-process-number');
        const processInput = form.querySelector(`#bulk-process-${processNumber}`);

        if (!processInput) continue;
        const processValue = processInput.value.trim();

        if (i === 0 && !processValue) {
            alert('O primeiro processo deve ser preenchido.');
            processInput.focus();
            return;
        }

        if (i === 0 && processValue) firstProcessFilled = true;

        if (processValue) {
            const now = new Date();
            const entry = {
                subjectId: subjectId,
                subjectText: assunto.texto,
                processNumber: processValue,
                assuntoProcesso: form.querySelector(`#bulk-assunto-processo-${processNumber}`)?.value.trim() || '',
                contributor: form.querySelector(`#bulk-contributor-${processNumber}`)?.value.trim() || '',
                ctm: form.querySelector(`#bulk-ctm-${processNumber}`)?.value.trim() || '',
                observation: form.querySelector(`#bulk-observation-${processNumber}`)?.value.trim() || '',
                prazo: form.querySelector(`#bulk-prazo-${processNumber}`)?.value.trim() || '',
                alvaraSituation: form.querySelector(`#bulk-alvara-situation-${processNumber}`)?.value.trim() || '',
                server: currentUser,
                date: now.toLocaleDateString('pt-BR'),
                time: now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
                timestamp: now.getTime()
            };
            entriesToSave.push(entry);
        }
    }

    if (!firstProcessFilled) return alert('Pelo menos o primeiro processo deve ser preenchido.');
    if (entriesToSave.length === 0) return alert('Nenhum processo foi preenchido.');

    if (!confirm(`Deseja salvar ${entriesToSave.length} entrada(s) para o assunto "${assunto.texto}"?`)) return;

    const saveBtn = document.getElementById('save-all-bulk');
    setButtonLoading(saveBtn, true);

    try {
        for (const entry of entriesToSave) {
            if (firebaseConnected && database) {
                const entriesRef = ref(database, 'gluos_entries');
                await push(entriesRef, entry);
            } else {
                entry.id = 'local_' + Date.now() + '_' + Math.random();
                allEntries.unshift(entry);
            }
        }
        showSuccessModal(`${entriesToSave.length} entrada(s) salva(s) com sucesso!`);
        handleResetBulkForms();
    } catch (error) {
        alert('Erro ao salvar as entradas. Tente novamente.');
    } finally {
        setButtonLoading(saveBtn, false);
    }
}

function handleResetBulkForms() {
    const container = document.getElementById('bulk-forms-container');
    const processesContainer = document.getElementById('bulk-processes-container');

    if (container) container.classList.add('hidden');
    if (processesContainer) processesContainer.innerHTML = '';

    document.getElementById('bulk-subject-number').value = '';
    document.getElementById('bulk-subject-select').value = '';
    document.getElementById('bulk-quantity').value = '5';
}


// Setup para Novo: Vários assuntos
function setupMultiSubjectEntries() {
    const form = document.getElementById('multi-subject-form');
    const processNumberInput = document.getElementById('multi-process-number');
    const assuntoProcessoInput = document.getElementById('multi-assunto-processo');
    const contributorInput = document.getElementById('multi-contributor');
    const ctmInput = document.getElementById('multi-ctm');

    if (form) form.addEventListener('submit', handleMultiSubjectSubmit);

    if (processNumberInput) {
        processNumberInput.addEventListener('input', async function() {
            let numeroProcesso = this.value.trim();
            numeroProcesso = numeroProcesso.replace(/\//g, "-");

            if (!numeroProcesso) {
                if(contributorInput) contributorInput.value = '';
                if(ctmInput) ctmInput.value = '';
                if(assuntoProcessoInput) assuntoProcessoInput.value = '';
                return;
            }

            try {
                if (processosDatabase) {
                    const refProc = ref(processosDatabase, 'processos/' + numeroProcesso);
                    const snapshot = await get(refProc);

                    if (snapshot.exists()) {
                        const dados = snapshot.val();
                        if(contributorInput) contributorInput.value = dados.Requerente || '';
                        if(ctmInput) ctmInput.value = dados.CTM || '';
                        if(assuntoProcessoInput) assuntoProcessoInput.value = dados.Assunto || '';
                    } else {
                        if(contributorInput) contributorInput.value = '';
                        if(ctmInput) ctmInput.value = '';
                        if(assuntoProcessoInput) assuntoProcessoInput.value = '';
                    }
                }
            } catch (err) {
                if(contributorInput) contributorInput.value = '';
                if(ctmInput) ctmInput.value = '';
                if(assuntoProcessoInput) assuntoProcessoInput.value = '';
            }
        });
    }

    for (let i = 1; i <= 5; i++) {
        setupSubjectPair(i);
    }
    populateMultiSubjectSelects();
}

function setupSubjectPair(index) {
    const idInput = document.getElementById(`subject${index}-id`);
    const selectInput = document.getElementById(`subject${index}-select`);

    if (idInput && selectInput) {
        idInput.addEventListener('input', function() {
            const num = parseInt(this.value);
            if (num >= 1 && num <= 50) {
                const assunto = GLUOS_DATA.assuntos.find(a => a.id === num);
                if (assunto) selectInput.value = assunto.id;
            } else if (!this.value) {
                selectInput.value = '';
            }
        });

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
            while (select.options.length > 1) {
                select.removeChild(select.lastChild);
            }
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

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const processNumber = document.getElementById('multi-process-number').value.trim();
    const assuntoProcesso = document.getElementById('multi-assunto-processo')?.value.trim() || '';
    const contributor = document.getElementById('multi-contributor').value.trim();
    const ctm = document.getElementById('multi-ctm').value.trim();
    const observation = document.getElementById('multi-observation').value.trim();
    const prazo = document.getElementById('multi-prazo')?.value.trim() || '';
    const alvaraSituation = document.getElementById('multi-alvara-situation').value.trim();

    if (!processNumber) return alert('Por favor, informe o número do processo.');

    const selectedSubjects = [];
    for (let i = 1; i <= 5; i++) {
        const subjectId = parseInt(document.getElementById(`subject${i}-select`).value);
        if (subjectId) {
            const assunto = GLUOS_DATA.assuntos.find(a => a.id === subjectId);
            if (assunto) selectedSubjects.push({ id: subjectId, text: assunto.texto });
        }
    }

    if (selectedSubjects.length === 0) return alert('Por favor, selecione pelo menos um assunto.');

    setButtonLoading(submitBtn, true);

    try {
        const now = new Date();
        const savedEntries = [];

        for (const subject of selectedSubjects) {
            const entry = {
                subjectId: subject.id,
                subjectText: subject.text,
                processNumber: processNumber,
                assuntoProcesso: assuntoProcesso,
                contributor: contributor,
                ctm: ctm,
                observation: observation,
                prazo: prazo,
                alvaraSituation: alvaraSituation,
                server: currentUser,
                date: now.toLocaleDateString('pt-BR'),
                time: now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
                timestamp: now.getTime()
            };

            if (firebaseConnected && database) {
                const entriesRef = ref(database, 'gluos_entries');
                await push(entriesRef, entry);
            } else {
                entry.id = 'local_' + Date.now() + '_' + subject.id;
                allEntries.unshift(entry);
            }
            savedEntries.push(entry);
        }

        form.reset();
        for (let i = 1; i <= 5; i++) {
            document.getElementById(`subject${i}-id`).value = '';
        }
        const message = `${savedEntries.length} entradas salvas com sucesso!\n\nAssuntos cadastrados:\n${savedEntries.map(e => `- ${e.subjectText}`).join('\n')}`;
        showSuccessModal(message);

    } catch (error) {
        alert('Erro ao salvar entradas. Tente novamente.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}


// Pesquisa
function setupSearch() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchSearchTab(tabName);
        });
    });
    
    const searchBtn = document.getElementById('search-submit');
    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
}

function switchSearchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
    
    document.querySelectorAll('.search-tab').forEach(tab => tab.classList.remove('active'));
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
            if (!processNumber) return alert('Digite o número do processo.');
            filteredEntries = allEntries.filter(entry => 
                entry.processNumber && entry.processNumber.toLowerCase().includes(processNumber.toLowerCase())
            );
        } else if (activeTab.id === 'date-search') {
            const searchDate = document.getElementById('search-date').value;
            if (!searchDate) return alert('Selecione uma data.');
            const targetDate = new Date(searchDate + 'T00:00:00').toLocaleDateString('pt-BR');
            filteredEntries = allEntries.filter(entry => entry.date === targetDate);
        } else if (activeTab.id === 'server-search') {
            const serverName = document.getElementById('search-server').value;
            if (!serverName) return alert('Selecione um servidor.');
            filteredEntries = allEntries.filter(entry => entry.server === serverName);
        }
        
        displaySearchResults(filteredEntries);
        
    } catch (error) {
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
        tableBody.innerHTML = `<tr><td colspan="10" class="text-center">Nenhum resultado encontrado.</td></tr>`;
    } else {
        entries.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.date || '-'}</td>
                <td>${entry.time || '-'}</td>
                <td>${entry.server || '-'}</td>
                <td>${entry.processNumber || '-'}</td>
                <td title="${entry.subjectText || '-'}">${truncateText(entry.subjectText || '-', 30)}</td>
                <td title="${entry.assuntoProcesso || '-'}">${truncateText(entry.assuntoProcesso || '-', 30)}</td>
                <td>${entry.contributor || '-'}</td>
                <td>${entry.ctm || '-'}</td>
                <td>${entry.prazo || '-'}</td>
                <td title="${entry.observation || '-'}">${truncateText(entry.observation || '-', 40)}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    resultsContainer.classList.remove('hidden');
}


// Paginação e Base de Dados
let currentPage = 1;
let itemsPerPage = 500;
let currentEntries = [];
let totalPages = 1;

function setupDatabase() {
    const applyBtn = document.getElementById('apply-filters');
    const clearBtn = document.getElementById('clear-filters');
    if (applyBtn) applyBtn.addEventListener('click', applyDatabaseFilters);
    if (clearBtn) clearBtn.addEventListener('click', clearDatabaseFilters);
    setupPaginationEventListeners();
}

function loadDatabaseTable(entries = null) {
    const entriesToShow = entries || allEntries;

    const totalRecords = document.getElementById('total-records');
    if (totalRecords) totalRecords.textContent = `${entriesToShow.length} registro(s)`;

    if (entriesToShow.length === 0) {
        const tableBody = document.querySelector('#database-table tbody');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="11" class="text-center">Nenhum registro encontrado.</td></tr>`;
        hidePaginationControls();
        return;
    }
    initializePagination(entriesToShow);
}

function applyDatabaseFilters() {
    const serverFilter = document.getElementById('filter-server').value;
    const subjectFilter = document.getElementById('filter-subject').value;
    const dateFilter = document.getElementById('filter-date').value;
    
    let filteredEntries = [...allEntries];
    
    if (serverFilter) filteredEntries = filteredEntries.filter(entry => entry.server === serverFilter);
    if (subjectFilter) filteredEntries = filteredEntries.filter(entry => entry.subjectId === parseInt(subjectFilter));
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

function initializePagination(entries) {
    currentEntries = entries;
    currentPage = 1;
    totalPages = Math.ceil(entries.length / itemsPerPage);
    displayCurrentPage();
    updatePaginationControls();
    setupPaginationEventListeners();
}

function displayCurrentPage() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageEntries = currentEntries.slice(startIndex, endIndex);

    const tableBody = document.querySelector('#database-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

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
            <td title="${entry.assuntoProcesso || '-'}">${truncateText(entry.assuntoProcesso || '-', 30)}</td>
            <td>${entry.contributor || '-'}</td>
            <td>${entry.ctm || '-'}</td>
            <td>${entry.prazo || '-'}</td>
            <td title="${entry.observation || '-'}">${truncateText(entry.observation || '-', 40)}</td>
            <td>${actionsHtml}</td>
        `;
        tableBody.appendChild(row);
    });

    updatePaginationInfo();
}

function updatePaginationInfo() {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, currentEntries.length);
    const totalEntries = currentEntries.length;

    const infoText = `Mostrando ${startIndex}-${endIndex} de ${totalEntries} registros`;
    const infoElements = [
        document.getElementById('pagination-info-text'),
        document.getElementById('pagination-info-text-bottom')
    ];
    infoElements.forEach(element => { if (element) element.textContent = infoText; });
}

function updatePaginationControls() {
    if (totalPages <= 1) {
        hidePaginationControls();
        return;
    }
    showPaginationControls();
    updateNavigationButtons();
    updatePageNumbers();
}

function showPaginationControls() {
    document.querySelectorAll('.pagination-container').forEach(container => container.style.display = 'flex');
}

function hidePaginationControls() {
    document.querySelectorAll('.pagination-container').forEach(container => container.style.display = 'none');
}

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
            if (button) button.disabled = buttonGroup.condition;
        });
    });
}

function updatePageNumbers() {
    const pageNumberContainers = [
        document.getElementById('page-numbers-top'),
        document.getElementById('page-numbers-bottom')
    ];
    pageNumberContainers.forEach(container => {
        if (container) container.innerHTML = generatePageNumbers();
    });
}

function generatePageNumbers() {
    let html = '';
    const maxVisiblePages = 15;

    if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) html += createPageButton(i);
    } else {
        if (currentPage <= 10) {
            for (let i = 1; i <= 15; i++) html += createPageButton(i);
            if (totalPages > 15) html += '<span class="pagination-ellipsis">...</span>';
        } else if (currentPage > totalPages - 10) {
            if (totalPages > 15) html += '<span class="pagination-ellipsis">...</span>';
            for (let i = Math.max(1, totalPages - 14); i <= totalPages; i++) html += createPageButton(i);
        } else {
            html += createPageButton(1) + '<span class="pagination-ellipsis">...</span>';
            const start = Math.max(2, currentPage - 7);
            const end = Math.min(totalPages - 1, currentPage + 7);
            for (let i = start; i <= end; i++) html += createPageButton(i);
            html += '<span class="pagination-ellipsis">...</span>' + createPageButton(totalPages);
        }
    }
    return html;
}

function createPageButton(pageNumber) {
    const isActive = pageNumber === currentPage;
    const activeClass = isActive ? ' active' : '';
    return `<button class="page-number-btn${activeClass}" onclick="goToPage(${pageNumber})">${pageNumber}</button>`;
}

window.goToPage = function(pageNumber) {
    if (pageNumber < 1 || pageNumber > totalPages || pageNumber === currentPage) return;
    currentPage = pageNumber;
    displayCurrentPage();
    updatePaginationControls();
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupPaginationEventListeners() {
    const paginationButtons = [
        { ids: ['first-page-btn', 'first-page-btn-bottom'], handler: () => window.goToPage(1) },
        { ids: ['prev-page-btn', 'prev-page-btn-bottom'], handler: () => window.goToPage(currentPage - 1) },
        { ids: ['next-page-btn', 'next-page-btn-bottom'], handler: () => window.goToPage(currentPage + 1) },
        { ids: ['last-page-btn', 'last-page-btn-bottom'], handler: () => window.goToPage(totalPages) }
    ];

    paginationButtons.forEach(buttonGroup => {
        buttonGroup.ids.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.removeEventListener('click', buttonGroup.handler);
                button.addEventListener('click', buttonGroup.handler);
            }
        });
    });
}


// Edição e Exclusão Global
window.editEntry = function(entryId) {
    const entry = allEntries.find(e => e.id === entryId);
    if (!entry) return alert('Entrada não encontrada.');
    if (entry.server !== currentUser) return alert('Você só pode editar suas próprias entradas.');
    showEditModal(entry);
};

window.deleteEntry = async function(entryId) {
    const entry = allEntries.find(e => e.id === entryId);
    if (!entry) return alert('Entrada não encontrada.');
    if (entry.server !== currentUser) return alert('Você só pode excluir suas próprias entradas.');
    
    if (!confirm('Tem certeza que deseja excluir esta entrada?')) return;
    
    try {
        if (firebaseConnected && database && !entryId.startsWith('local_')) {
            const entryRef = ref(database, `gluos_entries/${entryId}`);
            await remove(entryRef);
        } else {
            allEntries = allEntries.filter(e => e.id !== entryId);
            updateRecordCount();
        }
        showSuccessModal('Entrada excluída com sucesso!');
    } catch (error) {
        alert('Erro ao excluir entrada. Tente novamente.');
    }
};

// Relatórios
function setupReports() {
    const personalBtn = document.getElementById('personal-report-btn');
    const completeBtn = document.getElementById('complete-report-btn');
    const generateBtn = document.getElementById('generate-report-btn');
    
    if (personalBtn) personalBtn.addEventListener('click', () => { currentReportType = 'personal'; showReportForm('Relatório Pessoal'); });
    if (completeBtn) completeBtn.addEventListener('click', () => { currentReportType = 'complete'; showReportForm('Relatório Completo'); });
    if (generateBtn) generateBtn.addEventListener('click', handleGenerateReport);
}

function showReportForm(title) {
    const form = document.getElementById('report-form');
    const formTitle = document.getElementById('report-form-title');
    
    if (form && formTitle) {
        formTitle.textContent = title;
        form.classList.remove('hidden');
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
    
    if (!startDate || !endDate) return alert('Selecione as datas inicial e final.');
    if (new Date(startDate) > new Date(endDate)) return alert('A data inicial não pode ser maior que a data final.');
    
    const generateBtn = document.getElementById('generate-report-btn');
    setButtonLoading(generateBtn, true);
    
    try {
        if (currentReportType === 'personal') generatePersonalReport(startDate, endDate);
        else if (currentReportType === 'complete') generateCompleteReport(startDate, endDate);
    } catch (error) {
        alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
        setButtonLoading(generateBtn, false);
    }
}

function generatePersonalReport(startDate, endDate) {
    const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
    const endTimestamp = new Date(endDate + 'T23:59:59').getTime();
    
    const userEntries = allEntries.filter(entry => entry.server === currentUser && entry.timestamp >= startTimestamp && entry.timestamp <= endTimestamp);
    
    const subjectCount = {};
    userEntries.forEach(entry => {
        if (!subjectCount[entry.subjectId]) subjectCount[entry.subjectId] = { id: entry.subjectId, text: entry.subjectText, count: 0 };
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
    const reportTitle = document.getElementById('report-title');
    const reportMeta = document.getElementById('report-meta');
    
    if (reportTitle) reportTitle.textContent = 'Relatório Pessoal de Produtividade';
    if (reportMeta) {
        reportMeta.innerHTML = `<p><strong>Usuário:</strong> ${currentUser}</p><p><strong>Período:</strong> ${formatDateBR(startDate)} a ${formatDateBR(endDate)}</p><p><strong>Total de Entradas:</strong> ${totalEntries}</p>`;
    }
    
    const tableHead = document.getElementById('report-table-head');
    const tableBody = document.getElementById('report-table-body');
    const tableFoot = document.getElementById('report-table-foot');
    
    if (tableHead) tableHead.innerHTML = `<tr><th>Assunto</th><th>Total</th><th>%</th></tr>`;
    
    if (tableBody) {
        tableBody.innerHTML = '';
        if (reportData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center">Nenhum registro encontrado no período.</td></tr>`;
        } else {
            reportData.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${item.text}</td><td>${item.count}</td><td>${item.percentage}%</td>`;
                tableBody.appendChild(row);
            });
        }
    }
    
    if (tableFoot) tableFoot.innerHTML = `<tr><th><strong>TOTAL GERAL</strong></th><th><strong>${totalEntries}</strong></th><th><strong>100%</strong></th></tr>`;
    
    const summary = document.getElementById('summary-content');
    if (summary && totalEntries > 0) {
        const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
        const endTimestamp = new Date(endDate + 'T23:59:59').getTime();
        const dates = [...new Set(allEntries.filter(entry => entry.server === currentUser && entry.timestamp >= startTimestamp && entry.timestamp <= endTimestamp).map(entry => entry.date))];
        const activeDays = dates.length;
        const avgPerDay = activeDays > 0 ? (totalEntries / activeDays).toFixed(1) : '0.0';
        summary.innerHTML = `<p><strong>Dias com atividade:</strong> ${activeDays}</p><p><strong>Média diária:</strong> ${avgPerDay} entradas/dia</p>`;
        document.getElementById('report-summary').classList.remove('hidden');
    } else {
        document.getElementById('report-summary').classList.add('hidden');
    }
    
    document.getElementById('report-results').classList.remove('hidden');
}

function generateCompleteReport(startDate, endDate) {
    const usersWithoutAdmin = GLUOS_DATA.usuarios.filter(user => user !== "Admin");
    const startTimestamp = new Date(startDate + 'T00:00:00').getTime();
    const endTimestamp = new Date(endDate + 'T23:59:59').getTime();
    const periodEntries = allEntries.filter(entry => entry.timestamp >= startTimestamp && entry.timestamp <= endTimestamp);
    
    const reportMatrix = {};
    const userTotals = {};
    const subjectTotals = {};
    let grandTotal = 0;
    
    usersWithoutAdmin.forEach(user => userTotals[user] = 0);
    GLUOS_DATA.assuntos.forEach(subject => {
        reportMatrix[subject.id] = { id: subject.id, text: subject.texto, users: {} };
        subjectTotals[subject.id] = 0;
        usersWithoutAdmin.forEach(user => reportMatrix[subject.id].users[user] = 0);
    });
    
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
    
    const reportData = Object.values(reportMatrix).filter(subject => subjectTotals[subject.id] > 0).map(subject => ({
        ...subject,
        total: subjectTotals[subject.id],
        percentage: grandTotal > 0 ? ((subjectTotals[subject.id] / grandTotal) * 100).toFixed(1) : '0.0'
    }));
    
    reportData.sort((a, b) => b.total - a.total);
    displayCompleteReport(reportData, userTotals, grandTotal, startDate, endDate, usersWithoutAdmin);
}

function displayCompleteReport(reportData, userTotals, grandTotal, startDate, endDate, usersWithoutAdmin) {
    const reportTitle = document.getElementById('report-title');
    const reportMeta = document.getElementById('report-meta');
    
    if (reportTitle) reportTitle.textContent = 'Relatório Completo de Produtividade';
    if (reportMeta) reportMeta.innerHTML = `<p><strong>Período:</strong> ${formatDateBR(startDate)} a ${formatDateBR(endDate)}</p><p><strong>Total de Entradas:</strong> ${grandTotal}</p><p><strong>Relatório gerado por:</strong> ${currentUser}</p>`;
    
    const tableHead = document.getElementById('report-table-head');
    if (tableHead) {
        let headerHtml = '<tr><th style="text-align: left; min-width: 300px;">Assunto</th>';
        usersWithoutAdmin.forEach(user => headerHtml += `<th style="text-align: center; min-width: 80px;">${user}</th>`);
        headerHtml += '<th style="text-align: center; min-width: 80px;">TOTAL</th><th style="text-align: center; min-width: 60px;">%</th></tr>';
        tableHead.innerHTML = headerHtml;
    }
    
    const tableBody = document.getElementById('report-table-body');
    if (tableBody) {
        tableBody.innerHTML = '';
        if (reportData.length === 0) {
            const colspan = usersWithoutAdmin.length + 3;
            tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center">Nenhum registro encontrado no período.</td></tr>`;
        } else {
            reportData.forEach(subject => {
                const row = document.createElement('tr');
                let rowHtml = `<td style="text-align: left; max-width: 300px; word-wrap: break-word;">${subject.text}</td>`;
                usersWithoutAdmin.forEach(user => {
                    const count = subject.users[user] || 0;
                    rowHtml += `<td style="text-align: center; ${count > 0 ? 'font-weight: bold;' : ''}">${count}</td>`;
                });
                rowHtml += `<td style="text-align: center; font-weight: bold;">${subject.total}</td><td style="text-align: center;">${subject.percentage}%</td>`;
                row.innerHTML = rowHtml;
                tableBody.appendChild(row);
            });
        }
    }
    
    const tableFoot = document.getElementById('report-table-foot');
    if (tableFoot) {
        let footerHtml = '<tr style="background: var(--color-bg-6); font-weight: bold;"><th style="text-align: left;">TOTAL GERAL</th>';
        usersWithoutAdmin.forEach(user => footerHtml += `<th style="text-align: center;">${userTotals[user]}</th>`);
        footerHtml += `<th style="text-align: center;">${grandTotal}</th><th style="text-align: center;">100%</th></tr>`;
        tableFoot.innerHTML = footerHtml;
    }
    
    const reportTable = document.getElementById('report-table');
    if (reportTable) reportTable.classList.add('admin-report-table');
    
    document.getElementById('report-results').classList.remove('hidden');
    document.getElementById('report-summary').classList.add('hidden');
}


// Perfil e Modais
function setupProfile() {
    const passwordForm = document.getElementById('password-change-form');
    if (passwordForm) passwordForm.addEventListener('submit', handlePasswordChange);
}

function showProfileModal() {
    const modal = document.getElementById('profile-modal');
    const username = document.getElementById('profile-username');
    if (username) username.textContent = currentUser || 'Usuário';
    if (modal) modal.classList.remove('hidden');
}

async function handlePasswordChange(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const errorDiv = document.getElementById('password-error');
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (errorDiv) errorDiv.classList.add('hidden');
    if (newPassword !== confirmPassword) return showPasswordError('As senhas não coincidem.');
    if (newPassword.length < 6) return showPasswordError('A nova senha deve ter pelo menos 6 caracteres.');

    setButtonLoading(submitBtn, true);
    try {
        const user = auth.currentUser;
        if (!user || !user.email) return showPasswordError('Usuário não autenticado.');
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        e.target.reset();
        hideProfileModal();
        showSuccessModal('Senha alterada com sucesso!');
    } catch (error) {
        if (error.code === 'auth/wrong-password') showPasswordError('Senha atual incorreta.');
        else if (error.code === 'auth/weak-password') showPasswordError('A nova senha é muito fraca.');
        else showPasswordError('Erro ao alterar senha. Tente novamente.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

function showPasswordError(message) {
    const errorDiv = document.getElementById('password-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    } else {
        alert(message);
    }
}

function hideProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.add('hidden');
    const form = document.getElementById('password-change-form');
    if (form) form.reset();
    const errorDiv = document.getElementById('password-error');
    if (errorDiv) errorDiv.classList.add('hidden');
}

function setupModals() {
    const closeModalBtn = document.getElementById('close-modal');
    const cancelProfileBtn = document.getElementById('cancel-profile');
    const cancelEditBtn = document.getElementById('cancel-edit');
    
    if (closeModalBtn) closeModalBtn.addEventListener('click', hideSuccessModal);
    if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', hideProfileModal);
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', hideEditModal);
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.add('hidden');
        });
    });
    
    const editForm = document.getElementById('edit-entry-form');
    if (editForm) editForm.addEventListener('submit', handleEditEntry);
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
    document.getElementById('edit-entry-id').value = entry.id;
    document.getElementById('edit-subject-select').value = entry.subjectId;
    document.getElementById('edit-process-number').value = entry.processNumber || '';
    document.getElementById('edit-assunto-processo').value = entry.assuntoProcesso || '';
    document.getElementById('edit-contributor').value = entry.contributor || '';
    document.getElementById('edit-ctm').value = entry.ctm || '';
    document.getElementById('edit-observation').value = entry.observation || '';
    document.getElementById('edit-prazo').value = entry.prazo || '';
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
        assuntoProcesso: document.getElementById('edit-assunto-processo').value.trim(),
        contributor: document.getElementById('edit-contributor').value.trim(),
        ctm: document.getElementById('edit-ctm').value.trim(),
        observation: document.getElementById('edit-observation').value.trim(),
        prazo: document.getElementById('edit-prazo').value.trim(),
        alvaraSituation: document.getElementById('edit-alvara-situation').value.trim()
    };
    
    if (!updatedEntry.subjectId || !updatedEntry.processNumber) return alert('Por favor, preencha o assunto e o número do processo.');
    
    setButtonLoading(submitBtn, true);
    
    try {
        if (firebaseConnected && database && !entryId.startsWith('local_')) {
            const entryRef = ref(database, `gluos_entries/${entryId}`);
            await update(entryRef, updatedEntry);
        } else {
            const entryIndex = allEntries.findIndex(e => e.id === entryId);
            if (entryIndex !== -1) allEntries[entryIndex] = { ...allEntries[entryIndex], ...updatedEntry };
        }
        hideEditModal();
        showSuccessModal('Entrada atualizada com sucesso!');
    } catch (error) {
        alert('Erro ao atualizar entrada. Tente novamente.');
    } finally {
        setButtonLoading(submitBtn, false);
    }
}

// Utilidades
function populateSelectOptions() {
    const subjectSelects = ['subject-select', 'bulk-subject-select', 'edit-subject-select', 'filter-subject', 'subject1-select', 'subject2-select', 'subject3-select', 'subject4-select', 'subject5-select'];
    subjectSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            while (select.children.length > 1) select.removeChild(select.lastChild);
            GLUOS_DATA.assuntos.forEach(assunto => {
                const option = document.createElement('option');
                option.value = assunto.id;
                option.textContent = `${assunto.id} - ${assunto.texto}`;
                select.appendChild(option);
            });
        }
    });
    
    const serverSelects = ['search-server', 'filter-server'];
    serverSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            while (select.children.length > 1) select.removeChild(select.lastChild);
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
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(screenName + '-screen');
    if (targetScreen) {
        targetScreen.classList.add('active');
        if (screenName === 'report') {
            const reportForm = document.getElementById('report-form');
            const reportResults = document.getElementById('report-results');
            if (reportForm) reportForm.classList.add('hidden');
            if (reportResults) reportResults.classList.add('hidden');
            currentReportType = null;
        }
    }
}

function updateUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (userInfo) userInfo.textContent = currentUser ? `Usuário: ${currentUser}` : 'Bem-vindo!';
}

function updateDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const datetimeInfo = document.getElementById('datetime-info');
    if (datetimeInfo) datetimeInfo.textContent = dateTimeString;
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
    if (totalRecords) totalRecords.textContent = `${allEntries.length} registro(s)`;
}

function formatDateBR(dateString) { return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR'); }
function truncateText(text, maxLength) { return (!text || text.length <= maxLength) ? text : text.substring(0, maxLength) + '...'; }
function setButtonLoading(button, loading) {
    if (!button) return;
    if (loading) { button.classList.add('loading'); button.disabled = true; } 
    else { button.classList.remove('loading'); button.disabled = false; }
}