// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAmrAtNIsd7Bp-tRAmavI-wwlLgd4_zkEc",
    authDomain: "julianabeauty.firebaseapp.com",
    projectId: "julianabeauty",
    storageBucket: "julianabeauty.firebasestorage.app",
    messagingSenderId: "881281165323",
    appId: "1:881281165323:web:4c8e5a1e7ca37272a27f0e",
    measurementId: "G-GD2V0K5TF4"
};

// Inicialização segura do Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Serviços Firebase (singleton pattern com tratamento de erro melhorado)
const FirebaseServices = (function() {
    let instance = null;
    
    return function() {
        if (!instance) {
            try {
                instance = {
                    auth: firebase.auth(),
                    db: firebase.firestore()
                    // Removido: storage: firebase.storage(),
                    // Removido: functions: firebase.functions()
                };
                
                // Configurações padrão
                instance.auth.languageCode = 'pt-BR';
                instance.auth.useDeviceLanguage();
                
                // Persistência de autenticação
                instance.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                    .catch(error => {
                        console.error("Erro ao configurar persistência:", error);
                    });

                // Configuração do Firestore para desenvolvimento (remover em produção)
                if (window.location.hostname === "localhost") {
                    instance.db.settings({
                        host: "localhost:8080",
                        ssl: false
                    });
                    console.log("Firestore em modo de desenvolvimento local");
                }
                
            } catch (error) {
                console.error("Falha crítica na inicialização do Firebase:", error);
                throw new Error("Falha na inicialização dos serviços Firebase");
            }
        }
        return instance;
    };
})();

// Classe principal de utilitários de autenticação (versão melhorada)
class AuthUtils {
    constructor() {
        this.services = FirebaseServices();
        this._currentUser = null;
        this._userData = null;
    }

    // ========== MÉTODOS DE INTERFACE DO USUÁRIO (melhorados) ==========
    
    /**
     * Exibe um alerta para o usuário com mais opções
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo de alerta (success, danger, warning, info)
     * @param {string} elementId - ID do elemento de alerta (opcional)
     * @param {number} timeout - Tempo em ms para fechar automaticamente (0 para não fechar)
     */
    showAlert(message, type = 'info', elementId = 'alertMessage', timeout = 5000) {
        const alertElement = document.getElementById(elementId);
        if (!alertElement) {
            console.warn(`Elemento de alerta #${elementId} não encontrado`);
            return;
        }
        
        // Remove alertas anteriores
        alertElement.innerHTML = '';
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertElement.appendChild(alertDiv);
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        if (timeout > 0 && type === 'success') {
            setTimeout(() => {
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alertDiv);
                bsAlert.close();
            }, timeout);
        }
    }

    /**
     * Controla o estado de carregamento de um botão com mais opções
     * @param {boolean} isLoading - Se está carregando
     * @param {HTMLElement} buttonElement - Elemento do botão
     * @param {string} loadingText - Texto alternativo durante carregamento
     */
    toggleLoading(isLoading, buttonElement, loadingText = 'Processando...') {
        if (!buttonElement) return;
        
        const spinner = buttonElement.querySelector('.loading-spinner') || 
                       buttonElement.querySelector('.spinner-border');
        const buttonText = buttonElement.querySelector('.button-text') || 
                          buttonElement.querySelector('.btn-text');
        
        if (isLoading) {
            buttonElement.disabled = true;
            if (spinner) {
                spinner.style.display = 'inline-block';
                spinner.setAttribute('aria-busy', 'true');
            }
            if (buttonText) {
                buttonText.dataset.originalText = buttonText.textContent;
                buttonText.textContent = loadingText;
            }
        } else {
            buttonElement.disabled = false;
            if (spinner) {
                spinner.style.display = 'none';
                spinner.setAttribute('aria-busy', 'false');
            }
            if (buttonText && buttonText.dataset.originalText) {
                buttonText.textContent = buttonText.dataset.originalText;
            }
        }
    }

    // ========== VALIDAÇÃO DE FORMULÁRIOS (melhorada) ==========
    
    /**
     * Valida um campo individual do formulário com mais critérios
     * @param {HTMLInputElement} field - Campo a ser validado
     * @returns {boolean} - Se o campo é válido
     */
    validateField(field) {
        if (!field) return false;
        
        let isValid = field.checkValidity();
        const feedbackElement = field.nextElementSibling;
        
        // Validações adicionais para tipos específicos
        if (field.type === 'email' && field.value) {
            isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
            if (!isValid) field.setCustomValidity('Por favor, insira um e-mail válido');
        }
        
        if (field.type === 'tel' && field.value) {
            const digits = field.value.replace(/\D/g, '').length;
            isValid = digits >= 10 && digits <= 11;
            if (!isValid) field.setCustomValidity('Por favor, insira um telefone válido (10 ou 11 dígitos)');
        }
        
        field.classList.toggle('is-valid', isValid);
        field.classList.toggle('is-invalid', !isValid);
        
        if (feedbackElement && feedbackElement.classList.contains('invalid-feedback')) {
            feedbackElement.textContent = isValid ? '' : field.validationMessage;
        }
        
        return isValid;
    }

    /**
     * Valida um formulário completo com suporte a campos customizados
     * @param {HTMLFormElement} form - Formulário a ser validado
     * @param {Array} customValidators - Array de funções de validação customizada
     * @returns {boolean} - Se o formulário é válido
     */
    validateForm(form, customValidators = []) {
        if (!form) return false;
        
        let isValid = true;
        Array.from(form.elements).forEach(field => {
            if (field.willValidate && !this.validateField(field)) {
                isValid = false;
            }
        });
        
        // Validações customizadas
        customValidators.forEach(validator => {
            if (!validator()) isValid = false;
        });
        
        form.classList.add('was-validated');
        return isValid;
    }

    // ========== SEGURANÇA E SANITIZAÇÃO (melhorada) ==========
    
    /**
     * Sanitiza entrada de dados para prevenir XSS (versão mais robusta)
     * @param {string} input - Texto a ser sanitizado
     * @param {boolean} allowBasicFormatting - Permite quebras de linha e espaços
     * @returns {string} - Texto sanitizado
     */
    sanitizeInput(input, allowBasicFormatting = false) {
        if (typeof input !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = input;
        let sanitized = div.innerHTML
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
        
        if (allowBasicFormatting) {
            sanitized = sanitized
                .replace(/\n/g, '<br>')
                .replace(/  /g, ' &nbsp;');
        }
        
        return sanitized.trim();
    }

    // ========== AUTENTICAÇÃO BÁSICA (melhorada) ==========
    
    /**
     * Verifica se há um usuário autenticado (com cache)
     * @returns {Promise<boolean>} - Resolve com true se autenticado
     */
    async isUserLoggedIn() {
        if (this._currentUser !== null) return !!this._currentUser;
        
        return new Promise(resolve => {
            const unsubscribe = this.services.auth.onAuthStateChanged(user => {
                unsubscribe();
                this._currentUser = user;
                resolve(!!user);
            }, error => {
                console.error("Erro ao verificar estado de autenticação:", error);
                resolve(false);
            });
        });
    }

    /**
     * Obtém o usuário atual (com cache)
     * @returns {Promise<firebase.User|null>} - Usuário atual ou null
     */
    async getCurrentUser() {
        if (this._currentUser !== null) return this._currentUser;
        
        return new Promise(resolve => {
            const unsubscribe = this.services.auth.onAuthStateChanged(user => {
                unsubscribe();
                this._currentUser = user;
                resolve(user);
            }, error => {
                console.error("Erro ao obter usuário atual:", error);
                resolve(null);
            });
        });
    }

    /**
     * Obtém os dados do usuário atual (com cache)
     * @returns {Promise<object|null>} - Dados do usuário ou null
     */
    async getCurrentUserData() {
        if (this._userData !== null) return this._userData;
        
        const user = await this.getCurrentUser();
        if (!user) return null;
        
        try {
            const userDoc = await this.services.db.collection('usuarios').doc(user.uid).get();
            this._userData = userDoc.exists ? userDoc.data() : null;
            return this._userData;
        } catch (error) {
            console.error("Erro ao obter dados do usuário:", error);
            return null;
        }
    }

    /**
     * Requer autenticação, redirecionando se necessário (versão melhorada)
     * @param {string} redirectUrl - URL para redirecionar se não autenticado
     * @param {string} customMessage - Mensagem customizada para exibir
     * @returns {Promise<boolean>} - Resolve com true se autenticado
     */
    async requireAuth(redirectUrl = 'login.html', customMessage = null) {
        const isLoggedIn = await this.isUserLoggedIn();
        if (!isLoggedIn) {
            if (customMessage) {
                sessionStorage.setItem('authMessage', JSON.stringify({
                    message: customMessage,
                    type: 'warning'
                }));
            }
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            window.location.href = redirectUrl;
        }
        return isLoggedIn;
    }

    /**
     * Redireciona se já estiver autenticado (versão melhorada)
     * @param {string} redirectUrl - URL para redirecionar
     * @param {boolean} ignoreRedirectAfterLogin - Ignora a URL armazenada
     * @returns {Promise<boolean>} - Resolve com true se redirecionado
     */
    async redirectIfAuthenticated(redirectUrl = 'index.html', ignoreRedirectAfterLogin = false) {
        const isLoggedIn = await this.isUserLoggedIn();
        if (isLoggedIn) {
            const redirectAfterLogin = ignoreRedirectAfterLogin ? null : sessionStorage.getItem('redirectAfterLogin');
            window.location.href = redirectAfterLogin || redirectUrl;
            return true;
        }
        return false;
    }

    // ========== OPERAÇÕES COM FIRESTORE (melhoradas) ==========
    
    /**
     * Obtém dados do usuário no Firestore com tratamento de erro melhorado
     * @param {string} userId - ID do usuário
     * @returns {Promise<object|null>} - Dados do usuário ou null
     */
    async getUserData(userId) {
        if (!userId) {
            console.error("ID do usuário não fornecido");
            return null;
        }
        
        try {
            const doc = await this.services.db.collection('usuarios').doc(userId).get();
            
            if (!doc.exists) {
                console.warn(`Dados do usuário ${userId} não encontrados`);
                return null;
            }
            
            return doc.data();
        } catch (error) {
            console.error('Erro ao obter dados do usuário:', error);
            throw new Error('Não foi possível carregar os dados do usuário');
        }
    }

    /**
     * Cria ou atualiza dados do usuário no Firestore com transação
     * @param {string} userId - ID do usuário
     * @param {object} data - Dados a serem salvos
     * @param {boolean} useTransaction - Usar transação para garantir consistência
     * @returns {Promise<boolean>} - Resolve com true se bem-sucedido
     */
    async updateUserData(userId, data, useTransaction = true) {
        if (!userId || !data) {
            console.error("Dados insuficientes para atualização");
            return false;
        }
        
        try {
            if (useTransaction) {
                await this.services.db.runTransaction(async (transaction) => {
                    const userRef = this.services.db.collection('usuarios').doc(userId);
                    transaction.set(userRef, {
                        ...data,
                        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                });
            } else {
                await this.services.db.collection('usuarios').doc(userId).set({
                    ...data,
                    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
            
            // Limpa o cache de dados do usuário
            if (userId === this._currentUser?.uid) {
                this._userData = null;
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao atualizar dados do usuário:', error);
            throw new Error('Não foi possível salvar os dados do usuário');
        }
    }

    /**
     * Atualiza o timestamp de último login com transação
     * @param {string} userId - ID do usuário
     * @returns {Promise<void>}
     */
    async updateLastLogin(userId) {
        if (!userId) return;
        
        try {
            await this.services.db.runTransaction(async (transaction) => {
                const userRef = this.services.db.collection('usuarios').doc(userId);
                transaction.update(userRef, {
                    ultimoLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        } catch (error) {
            console.error('Erro ao atualizar último login:', error);
        }
    }

    // ========== AUTENTICAÇÃO COM E-MAIL/SENHA (melhorada) ==========
    
    /**
     * Realiza login com e-mail e senha (versão melhorada)
     * @param {string} email - E-mail do usuário
     * @param {string} password - Senha do usuário
     * @returns {Promise<firebase.auth.UserCredential>}
     */
    async loginWithEmail(email, password) {
        try {
            // Validação básica antes de tentar login
            if (!email || !password) {
                throw new Error('E-mail e senha são obrigatórios');
            }
            
            const userCredential = await this.services.auth.signInWithEmailAndPassword(email, password);
            
            // Atualiza último login em uma transação separada
            await this.updateLastLogin(userCredential.user.uid);
            
            // Limpa cache
            this._currentUser = userCredential.user;
            this._userData = null;
            
            return userCredential;
        } catch (error) {
            console.error('Erro no login:', error);
            throw this.translateAuthError(error);
        }
    }

    /**
     * Cadastra novo usuário com e-mail e senha (versão melhorada)
     * @param {string} email - E-mail do usuário
     * @param {string} password - Senha do usuário
     * @param {object} userData - Dados adicionais do usuário
     * @returns {Promise<firebase.auth.UserCredential>}
     */
    async registerWithEmail(email, password, userData = {}) {
        try {
            // Validação básica
            if (!email || !password) {
                throw new Error('E-mail e senha são obrigatórios');
            }
            
            // Sanitiza dados do usuário
            const sanitizedData = {
                nome: this.sanitizeInput(userData.nome || ''),
                email: email,
                telefone: this.sanitizeInput(userData.telefone || ''),
                perfil: 'cliente',
                dataCadastro: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const userCredential = await this.services.auth.createUserWithEmailAndPassword(email, password);
            
            // Usa transação para garantir que ambos os passos sejam completados
            await this.updateUserData(userCredential.user.uid, sanitizedData);
            
            // Limpa cache
            this._currentUser = userCredential.user;
            this._userData = sanitizedData;
            
            return userCredential;
        } catch (error) {
            console.error('Erro no cadastro:', error);
            
            // Tenta limpar usuário criado parcialmente
            if (error.code === 'auth/email-already-in-use') {
                try {
                    const user = await this.services.auth.signInWithEmailAndPassword(email, password);
                    await this.services.auth.signOut();
                } catch { /* Ignora erros secundários */ }
            }
            
            throw this.translateAuthError(error);
        }
    }

    /**
     * Envia e-mail de redefinição de senha (versão melhorada)
     * @param {string} email - E-mail do usuário
     * @returns {Promise<void>}
     */
    async sendPasswordResetEmail(email) {
        try {
            if (!email) {
                throw new Error('E-mail é obrigatório');
            }
            
            await this.services.auth.sendPasswordResetEmail(email, {
                url: window.location.origin + '/login.html',
                handleCodeInApp: false
            });
        } catch (error) {
            console.error('Erro ao enviar e-mail de redefinição:', error);
            throw this.translateAuthError(error);
        }
    }

    // ========== AUTENTICAÇÃO SOCIAL (melhorada) ==========
    
    /**
     * Realiza login com provedor Google (versão melhorada)
     * @returns {Promise<firebase.auth.UserCredential>}
     */
    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            
            const userCredential = await this.services.auth.signInWithPopup(provider);
            
            // Verifica se é um novo usuário
            if (userCredential.additionalUserInfo.isNewUser) {
                const userData = {
                    nome: this.sanitizeInput(userCredential.user.displayName || ''),
                    email: userCredential.user.email || '',
                    perfil: 'cliente',
                    dataCadastro: firebase.firestore.FieldValue.serverTimestamp(),
                    providerData: {
                        google: true
                    }
                };
                
                await this.updateUserData(userCredential.user.uid, userData);
            } else {
                await this.updateLastLogin(userCredential.user.uid);
            }
            
            // Limpa cache
            this._currentUser = userCredential.user;
            this._userData = null;
            
            return userCredential;
        } catch (error) {
            console.error('Erro no login com Google:', error);
            
            // Tratamento especial para erro de popup bloqueado
            if (error.code === 'auth/popup-blocked') {
                throw new Error('A janela de login foi bloqueada. Por favor, permita popups para este site e tente novamente.');
            }
            
            throw this.translateAuthError(error);
        }
    }

    // ========== LOGOUT (melhorado) ==========
    
    /**
     * Realiza logout do usuário (versão melhorada)
     * @param {boolean} redirect - Se deve redirecionar após logout
     * @param {string} redirectUrl - URL para redirecionar
     * @returns {Promise<boolean>} - Resolve com true se bem-sucedido
     */
    async logout(redirect = true, redirectUrl = 'index.html') {
        try {
            await this.services.auth.signOut();
            
            // Limpa cache
            this._currentUser = null;
            this._userData = null;
            
            if (redirect) {
                window.location.href = redirectUrl;
            }
            
            return true;
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            return false;
        }
    }

    // ========== INICIALIZAÇÃO DE COMPONENTES (melhorada) ==========
    
    /**
     * Inicializa toggles de visibilidade de senha (versão melhorada)
     */
    initPasswordToggles() {
        document.querySelectorAll('.toggle-password').forEach(button => {
            // Evita duplicação de event listeners
            if (button.dataset.listenerAdded !== 'true') {
                button.addEventListener('click', function() {
                    const input = this.previousElementSibling;
                    if (!input || input.type !== 'password' && input.type !== 'text') return;
                    
                    const icon = this.querySelector('i');
                    const isPassword = input.type === 'password';
                    
                    input.type = isPassword ? 'text' : 'password';
                    
                    if (icon) {
                        icon.classList.toggle('fa-eye', !isPassword);
                        icon.classList.toggle('fa-eye-slash', isPassword);
                        icon.setAttribute('aria-label', isPassword ? 'Mostrar senha' : 'Ocultar senha');
                    }
                });
                
                button.dataset.listenerAdded = 'true';
            }
        });
    }

    /**
     * Inicializa máscara para campo de telefone (versão melhorada)
     * @param {string} inputId - ID do input de telefone
     */
    initPhoneMask(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        
        // Evita duplicação de event listeners
        if (input.dataset.phoneMaskInitialized === 'true') return;
        
        input.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            
            // Formatar como (XX) XXXXX-XXXX
            let formattedValue = '';
            
            if (value.length > 0) {
                formattedValue = `(${value.slice(0, 2)}`;
            }
            if (value.length > 2) {
                formattedValue += ` ${value.slice(2, 7)}`;
            }
            if (value.length > 7) {
                formattedValue += `-${value.slice(7, 11)}`;
            }
            
            e.target.value = formattedValue;
        });
        
        input.dataset.phoneMaskInitialized = 'true';
    }

    /**
     * Inicializa navbar com estado de autenticação (versão melhorada)
     */
    async initAuthNavbar() {
        const navbar = document.getElementById('navbarNav');
        if (!navbar) return;
        
        // Verifica se já foi inicializada
        if (navbar.dataset.authInitialized === 'true') return;
        
        const authContainer = navbar.querySelector('.auth-container') || document.createElement('div');
        authContainer.className = 'auth-container ms-auto';
        
        try {
            const isLoggedIn = await this.isUserLoggedIn();
            
            if (isLoggedIn) {
                const user = await this.getCurrentUser();
                const userData = await this.getUserData(user.uid);
                const displayName = userData?.nome || user.displayName || user.email.split('@')[0];
                
                authContainer.innerHTML = `
                    <div class="dropdown">
                        <button class="btn btn-link nav-link dropdown-toggle d-flex align-items-center" 
                                type="button" id="userDropdown" data-bs-toggle="dropdown" 
                                aria-expanded="false">
                            <i class="fas fa-user-circle me-2"></i>
                            <span class="d-none d-md-inline">${this.sanitizeInput(displayName)}</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="perfil.html"><i class="fas fa-user me-2"></i> Perfil</a></li>
                            <li><a class="dropdown-item" href="meus-agendamentos.html"><i class="fas fa-calendar-alt me-2"></i> Agendamentos</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><button class="dropdown-item" id="logoutBtn"><i class="fas fa-sign-out-alt me-2"></i> Sair</button></li>
                        </ul>
                    </div>
                `;
                
                document.getElementById('logoutBtn')?.addEventListener('click', async () => {
                    await this.logout(true, 'index.html');
                });
            } else {
                authContainer.innerHTML = `
                    <div class="d-flex gap-2">
                        <a href="login.html" class="btn btn-outline-light">Entrar</a>
                        <a href="cadastro.html" class="btn btn-primary">Cadastrar</a>
                    </div>
                `;
            }
            
            if (!navbar.contains(authContainer)) {
                navbar.appendChild(authContainer);
            }
            
            navbar.dataset.authInitialized = 'true';
        } catch (error) {
            console.error('Erro ao inicializar navbar de autenticação:', error);
            // Fallback básico
            authContainer.innerHTML = `
                <div class="d-flex gap-2">
                    <a href="login.html" class="btn btn-outline-light">Entrar</a>
                    <a href="cadastro.html" class="btn btn-primary">Cadastrar</a>
                </div>
            `;
            
            if (!navbar.contains(authContainer)) {
                navbar.appendChild(authContainer);
            }
        }
    }

    // ========== UTILITÁRIOS (melhorados) ==========
    
    /**
     * Traduz erros de autenticação para mensagens amigáveis (versão expandida)
     * @param {Error} error - Erro original
     * @returns {Error} - Erro com mensagem traduzida
     */
    translateAuthError(error) {
        const messages = {
            // Erros de autenticação por e-mail/senha
            'auth/invalid-email': 'E-mail inválido. Por favor, verifique o formato.',
            'auth/user-disabled': 'Esta conta foi desativada. Entre em contato com o suporte.',
            'auth/user-not-found': 'Nenhuma conta encontrada com este e-mail.',
            'auth/wrong-password': 'Senha incorreta. Tente novamente ou redefina sua senha.',
            'auth/email-already-in-use': 'Este e-mail já está em uso. Tente fazer login.',
            'auth/operation-not-allowed': 'Método de autenticação não permitido.',
            'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres.',
            'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
            
            // Erros de provedores sociais
            'auth/account-exists-with-different-credential': 'Conta já existe com outro método de login.',
            'auth/popup-closed-by-user': 'Janela de autenticação fechada antes de completar.',
            'auth/cancelled-popup-request': 'Autenticação cancelada pelo usuário.',
            'auth/popup-blocked': 'A janela de login foi bloqueada. Permita popups para este site.',
            'auth/unauthorized-domain': 'Domínio não autorizado para autenticação.',
            
            // Erros do Firestore
            'permission-denied': 'Você não tem permissão para executar esta ação.',
            'not-found': 'Recurso não encontrado.',
            'unavailable': 'Serviço indisponível no momento. Tente novamente mais tarde.',
            
            // Erros genéricos
            'network-request-failed': 'Falha na conexão. Verifique sua internet.',
            'internal-error': 'Erro interno no servidor. Tente novamente mais tarde.'
        };
        
        // Verifica se é um erro do Firestore
        if (error.code && error.code.startsWith('firestore/')) {
            const code = error.code.replace('firestore/', '');
            return new Error(messages[code] || error.message || 'Erro no banco de dados');
        }
        
        // Verifica se é um erro de autenticação
        if (error.code && error.code.startsWith('auth/')) {
            return new Error(messages[error.code] || error.message || 'Erro na autenticação');
        }
        
        // Verifica mensagens genéricas
        return new Error(messages[error.code] || error.message || 'Ocorreu um erro inesperado');
    }

    /**
     * Executa uma operação com tratamento de erro e feedback visual
     * @param {Function} operation - Função assíncrona a ser executada
     * @param {HTMLElement} buttonElement - Elemento do botão (opcional)
     * @param {string} successMessage - Mensagem de sucesso (opcional)
     * @param {string} errorMessage - Mensagem de erro customizada (opcional)
     * @returns {Promise<any>} - Resultado da operação
     */
    async executeWithFeedback(operation, buttonElement = null, successMessage = null, errorMessage = null) {
        this.toggleLoading(true, buttonElement);
        
        try {
            const result = await operation();
            
            if (successMessage) {
                this.showAlert(successMessage, 'success');
            }
            
            return result;
        } catch (error) {
            console.error('Operação falhou:', error);
            
            const message = errorMessage || 
                           (error instanceof Error ? error.message : 'Ocorreu um erro');
            
            this.showAlert(message, 'danger');
            throw error;
        } finally {
            this.toggleLoading(false, buttonElement);
        }
    }
}

// Instância singleton do AuthUtils
const authUtilsInstance = new AuthUtils();

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa componentes com tratamento de erro
    try {
        authUtilsInstance.initPasswordToggles();
        authUtilsInstance.initAuthNavbar();
        
        // Inicializa máscara de telefone se existir
        if (document.getElementById('telefone')) {
            authUtilsInstance.initPhoneMask('telefone');
        }
        
        // Exibe mensagens armazenadas (útil para redirecionamentos)
        const authMessage = sessionStorage.getItem('authMessage');
        if (authMessage) {
            try {
                const { message, type } = JSON.parse(authMessage);
                authUtilsInstance.showAlert(message, type);
            } catch (e) {
                console.error('Erro ao processar mensagem:', e);
            }
            sessionStorage.removeItem('authMessage');
        }
    } catch (error) {
        console.error('Erro na inicialização:', error);
    }
});

// Exportação para módulos (se necessário)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = authUtilsInstance;
}

// Disponibiliza globalmente (opcional)
window.AuthUtils = authUtilsInstance;