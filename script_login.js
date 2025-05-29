// Scripts específicos para a página de login
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se usuário já está autenticado
    window.AuthUtils.redirectIfAuthenticated();
    
    // Inicializar validação em tempo real
    window.AuthUtils.initRealtimeValidation("loginForm");
    
    // Inicializar autenticação com Google
    window.AuthUtils.initGoogleAuth("googleLogin");
    
    // Configurar toggle de visibilidade de senha
    window.AuthUtils.initPasswordToggles();
    
    // Manipular envio do formulário de login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Limpar alertas anteriores
            window.AuthUtils.clearAlert();
            
            // Validar formulário
            if (!window.AuthUtils.validateForm(loginForm)) {
                return;
            }
            
            // Obter dados do formulário
            const email = document.getElementById("email").value;
            const senha = document.getElementById('senha').value;
            const lembrar = document.getElementById('lembrarLogin').checked;
            const submitButton = loginForm.querySelector('button[type="submit"]');
            
            // Definir persistência
            const persistence = lembrar 
                ? firebase.auth.Auth.Persistence.LOCAL 
                : firebase.auth.Auth.Persistence.SESSION;
            
            try {
                // Mostrar loading
                window.AuthUtils.toggleLoading(true, submitButton, 'Entrando...');
                
                // Fazer login
                await window.AuthUtils.loginWithEmail(email, senha, persistence);
                
                // Verificar redirecionamento
                const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
                if (redirectAfterLogin) {
                    sessionStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectAfterLogin;
                } else {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                console.error('Erro no login:', error);
                
                // Traduzir mensagens de erro comuns
                let errorMessage = 'Ocorreu um erro ao fazer login. Tente novamente.';
                
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'Usuário não encontrado. Verifique seu e-mail ou crie uma conta.';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Senha incorreta. Tente novamente ou recupere sua senha.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'E-mail inválido. Verifique o formato do e-mail.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage = 'Esta conta foi desativada. Entre em contato com o suporte.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Muitas tentativas de login. Tente novamente mais tarde ou recupere sua senha.';
                        break;
                }
                
                // Mostrar erro
                window.AuthUtils.showAlert(errorMessage, "danger");
                
                // Esconder loading
                window.AuthUtils.toggleLoading(false, submitButton);
            }
        });
    }
});