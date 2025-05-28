// Scripts específicos para a página de recuperação de senha
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se usuário já está autenticado
    AuthUtils.redirectIfAuthenticated();
    
    // Inicializar validação em tempo real
    AuthUtils.initRealtimeValidation('recuperarSenhaForm');
    
    // Manipular envio do formulário de recuperação de senha
    const recuperarSenhaForm = document.getElementById('recuperarSenhaForm');
    if (recuperarSenhaForm) {
        recuperarSenhaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Limpar alertas anteriores
            AuthUtils.clearAlert();
            
            // Validar formulário
            if (!AuthUtils.validateForm(recuperarSenhaForm)) {
                return;
            }
            
            // Obter e-mail do formulário
            const email = AuthUtils.sanitizeInput(document.getElementById('email').value);
            
            try {
                // Mostrar loading
                const submitButton = recuperarSenhaForm.querySelector('button[type="submit"]');
                AuthUtils.toggleLoading(true, submitButton);
                
                // Enviar e-mail de recuperação de senha
                await firebase.auth().sendPasswordResetEmail(email);
                
                // Esconder formulário e mostrar mensagem de sucesso
                document.getElementById('resetForm').classList.add('d-none');
                document.getElementById('successMessage').classList.remove('d-none');
                
            } catch (error) {
                console.error('Erro na recuperação de senha:', error);
                
                // Traduzir mensagens de erro comuns
                let errorMessage = 'Ocorreu um erro ao enviar o e-mail de recuperação. Tente novamente.';
                
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'Não encontramos uma conta com este e-mail.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'E-mail inválido. Verifique o formato do e-mail.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
                        break;
                }
                
                // Mostrar erro
                AuthUtils.showAlert(errorMessage, 'danger');
                
                // Esconder loading
                AuthUtils.toggleLoading(false, submitButton);
            }
        });
    }
});
