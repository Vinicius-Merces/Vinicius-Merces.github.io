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

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Configurações de autenticação
auth.languageCode = 'pt-BR';

// Funções de utilidade para autenticação
const AuthUtils = {
    // Mostrar mensagem de alerta
    showAlert: function(message, type, elementId = 'alertMessage') {
        const alertElement = document.getElementById(elementId);
        if (alertElement) {
            alertElement.textContent = message;
            alertElement.className = `alert alert-${type} d-block`;
            
            // Rolar para o alerta
            alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Esconder após 5 segundos para alertas de sucesso
            if (type === 'success') {
                setTimeout(() => {
                    alertElement.classList.add('d-none');
                }, 5000);
            }
        }
    },
    
    // Limpar mensagem de alerta
    clearAlert: function(elementId = 'alertMessage') {
        const alertElement = document.getElementById(elementId);
        if (alertElement) {
            alertElement.textContent = '';
            alertElement.className = 'alert d-none';
        }
    },
    
    // Mostrar/esconder spinner de carregamento
    toggleLoading: function(isLoading, buttonElement) {
        const spinner = buttonElement.querySelector('.loading-spinner');
        const buttonText = buttonElement.querySelector('.button-text');
        
        if (isLoading) {
            spinner.style.display = 'inline-block';
            buttonElement.disabled = true;
            buttonText.style.opacity = '0.7';
        } else {
            spinner.style.display = 'none';
            buttonElement.disabled = false;
            buttonText.style.opacity = '1';
        }
    },
    
    // Validar campo de formulário
    validateField: function(field) {
        const isValid = field.checkValidity();
        
        if (isValid) {
            field.classList.remove('is-invalid');
            field.classList.add('is-valid');
        } else {
            field.classList.remove('is-valid');
            field.classList.add('is-invalid');
        }
        
        return isValid;
    },
    
    // Validar formulário inteiro
    validateForm: function(form) {
        let isValid = form.checkValidity();
        
        // Validar cada campo e mostrar feedback
        Array.from(form.elements).forEach(field => {
            if (field.nodeName !== 'BUTTON' && field.nodeName !== 'FIELDSET') {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            }
        });
        
        return isValid;
    },
    
    // Sanitizar input para prevenir XSS
    sanitizeInput: function(input) {
        if (!input) return '';
        
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .trim();
    },
    
    // Verificar se usuário está autenticado
    isUserLoggedIn: function() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(user => {
                resolve(!!user);
            });
        });
    },
    
    // Obter usuário atual
    getCurrentUser: function() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged(user => {
                resolve(user);
            });
        });
    },
    
    // Obter dados do usuário do Firestore
    getUserData: async function(userId) {
        try {
            const doc = await db.collection('usuarios').doc(userId).get();
            if (doc.exists) {
                return doc.data();
            } else {
                console.log('Nenhum documento de usuário encontrado');
                return null;
            }
        } catch (error) {
            console.error('Erro ao obter dados do usuário:', error);
            return null;
        }
    },
    
    // Atualizar dados do usuário no Firestore
    updateUserData: async function(userId, data) {
        try {
            await db.collection('usuarios').doc(userId).update({
                ...data,
                atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Erro ao atualizar dados do usuário:', error);
            return false;
        }
    },
    
    // Criar documento de usuário no Firestore
    createUserDocument: async function(userId, userData) {
        try {
            await db.collection('usuarios').doc(userId).set({
                ...userData,
                perfil: 'cliente',
                dataCadastro: firebase.firestore.FieldValue.serverTimestamp(),
                ultimoLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Erro ao criar documento de usuário:', error);
            return false;
        }
    },
    
    // Atualizar timestamp de último login
    updateLastLogin: async function(userId) {
        try {
            await db.collection('usuarios').doc(userId).update({
                ultimoLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Erro ao atualizar último login:', error);
        }
    },
    
    // Redirecionar para página de login se não estiver autenticado
    requireAuth: async function(redirectUrl = 'login.html') {
        const isLoggedIn = await this.isUserLoggedIn();
        if (!isLoggedIn) {
            // Salvar URL atual para redirecionamento após login
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    },
    
    // Redirecionar para página inicial se já estiver autenticado
    redirectIfAuthenticated: async function(redirectUrl = 'index.html') {
        const isLoggedIn = await this.isUserLoggedIn();
        if (isLoggedIn) {
            // Verificar se há URL de redirecionamento salva
            const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
            if (redirectAfterLogin) {
                sessionStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectAfterLogin;
            } else {
                window.location.href = redirectUrl;
            }
            return true;
        }
        return false;
    },
    
    // Fazer logout
    logout: async function() {
        try {
            await auth.signOut();
            return true;
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            return false;
        }
    },
    
    // Inicializar elementos de toggle de senha
    initPasswordToggles: function() {
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', function() {
                const input = this.previousElementSibling;
                const icon = this.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    },
    
    // Inicializar validação em tempo real
    initRealtimeValidation: function(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.querySelectorAll('input, select, textarea').forEach(field => {
                field.addEventListener('blur', () => {
                    this.validateField(field);
                });
                
                field.addEventListener('input', () => {
                    if (field.classList.contains('is-invalid')) {
                        this.validateField(field);
                    }
                });
            });
        }
    },
    
    // Inicializar medidor de força de senha
    initPasswordStrengthMeter: function(passwordId) {
        const passwordInput = document.getElementById(passwordId);
        if (passwordInput) {
            const strengthMeter = passwordInput.parentElement.nextElementSibling;
            if (strengthMeter && strengthMeter.classList.contains('password-strength')) {
                const progressBar = strengthMeter.querySelector('.progress-bar');
                const strengthText = strengthMeter.querySelector('.strength-text');
                
                passwordInput.addEventListener('input', function() {
                    const password = this.value;
                    let strength = 0;
                    let feedback = 'Fraca';
                    let color = 'danger';
                    
                    if (password.length >= 6) strength += 20;
                    if (password.length >= 8) strength += 10;
                    if (/[A-Z]/.test(password)) strength += 20;
                    if (/[a-z]/.test(password)) strength += 10;
                    if (/[0-9]/.test(password)) strength += 20;
                    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
                    
                    if (strength > 80) {
                        feedback = 'Muito forte';
                        color = 'success';
                    } else if (strength > 60) {
                        feedback = 'Forte';
                        color = 'success';
                    } else if (strength > 40) {
                        feedback = 'Média';
                        color = 'warning';
                    } else if (strength > 20) {
                        feedback = 'Fraca';
                        color = 'danger';
                    } else {
                        feedback = 'Muito fraca';
                        color = 'danger';
                    }
                    
                    strengthMeter.classList.remove('d-none');
                    progressBar.style.width = `${strength}%`;
                    progressBar.className = `progress-bar bg-${color}`;
                    strengthText.textContent = `Força da senha: ${feedback}`;
                });
            }
        }
    },
    
    // Inicializar máscara para telefone
    initPhoneMask: function(phoneId) {
        const phoneInput = document.getElementById(phoneId);
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 11) value = value.slice(0, 11);
                
                // Formatar como (XX) XXXXX-XXXX
                if (value.length > 2) {
                    value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                }
                if (value.length > 10) {
                    value = `${value.slice(0, 10)}-${value.slice(10)}`;
                }
                
                e.target.value = value;
            });
        }
    },
    
    // Inicializar autenticação com Google
    initGoogleAuth: function(buttonId, redirectUrl = null) {
        const googleButton = document.getElementById(buttonId);
        if (googleButton) {
            googleButton.addEventListener('click', async () => {
                try {
                    this.toggleLoading(true, googleButton);
                    
                    const provider = new firebase.auth.GoogleAuthProvider();
                    const result = await auth.signInWithPopup(provider);
                    
                    // Verificar se é um novo usuário
                    if (result.additionalUserInfo.isNewUser) {
                        // Criar documento de usuário no Firestore
                        const user = result.user;
                        await this.createUserDocument(user.uid, {
                            nome: user.displayName || '',
                            email: user.email || '',
                            telefone: user.phoneNumber || '',
                            fotoUrl: user.photoURL || ''
                        });
                    } else {
                        // Atualizar último login
                        await this.updateLastLogin(result.user.uid);
                    }
                    
                    // Redirecionar após login
                    const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
                    if (redirectAfterLogin) {
                        sessionStorage.removeItem('redirectAfterLogin');
                        window.location.href = redirectAfterLogin;
                    } else if (redirectUrl) {
                        window.location.href = redirectUrl;
                    } else {
                        window.location.href = 'index.html';
                    }
                } catch (error) {
                    console.error('Erro na autenticação com Google:', error);
                    this.showAlert(`Erro na autenticação com Google: ${error.message}`, 'danger');
                    this.toggleLoading(false, googleButton);
                }
            });
        }
    },
    
    // Inicializar navbar com estado de autenticação
    initAuthNavbar: async function() {
        const navbarNav = document.getElementById('navbarNav');
        if (navbarNav) {
            const isLoggedIn = await this.isUserLoggedIn();
            const user = isLoggedIn ? await this.getCurrentUser() : null;
            
            // Elemento para itens de autenticação
            let authItems = navbarNav.querySelector('.auth-items');
            
            if (!authItems) {
                authItems = document.createElement('ul');
                authItems.className = 'navbar-nav ms-auto auth-items';
                navbarNav.appendChild(authItems);
            }
            
            if (isLoggedIn && user) {
                // Obter dados do usuário
                const userData = await this.getUserData(user.uid);
                const displayName = userData?.nome || user.displayName || user.email.split('@')[0];
                
                // Itens para usuário logado
                authItems.innerHTML = `
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="fas fa-user-circle me-1"></i> ${displayName}
                        </a>
                        <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                            <li><a class="dropdown-item" href="perfil.html"><i class="fas fa-user me-2"></i>Meu Perfil</a></li>
                            <li><a class="dropdown-item" href="meus-agendamentos.html"><i class="fas fa-calendar-check me-2"></i>Meus Agendamentos</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" id="logoutButton"><i class="fas fa-sign-out-alt me-2"></i>Sair</a></li>
                        </ul>
                    </li>
                `;
                
                // Adicionar evento de logout
                const logoutButton = authItems.querySelector('#logoutButton');
                if (logoutButton) {
                    logoutButton.addEventListener('click', async (e) => {
                        e.preventDefault();
                        await this.logout();
                        window.location.href = 'index.html';
                    });
                }
            } else {
                // Itens para usuário não logado
                authItems.innerHTML = `
                    <li class="nav-item">
                        <a class="nav-link" href="login.html">Entrar</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="cadastro.html">Cadastrar</a>
                    </li>
                `;
            }
        }
    }
};

// Inicializar elementos comuns de autenticação
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar toggles de senha
    AuthUtils.initPasswordToggles();
    
    // Inicializar navbar com estado de autenticação
    AuthUtils.initAuthNavbar();
});
