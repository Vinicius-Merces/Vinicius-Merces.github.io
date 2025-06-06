// Scripts específicos para a página de cadastro
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se usuário já está autenticado
    AuthUtils.redirectIfAuthenticated();
    
    // Inicializar validação em tempo real
    AuthUtils.initRealtimeValidation('cadastroForm');
    
    // Inicializar medidor de força de senha
    AuthUtils.initPasswordStrengthMeter('senha');
    
    // Inicializar máscara para telefone
    AuthUtils.initPhoneMask('telefone');
    
    // Inicializar autenticação com Google
    AuthUtils.initGoogleAuth('googleLogin');
    
    // Manipular envio do formulário de cadastro
    const cadastroForm = document.getElementById('cadastroForm');
    if (cadastroForm) {
        cadastroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Limpar alertas anteriores
            AuthUtils.clearAlert();
            
            // Validar formulário
            if (!AuthUtils.validateForm(cadastroForm)) {
                return;
            }
            
            // Verificar se senhas coincidem
            const senha = document.getElementById('senha').value;
            const confirmarSenha = document.getElementById('confirmarSenha').value;
            
            if (senha !== confirmarSenha) {
                document.getElementById('confirmarSenha').classList.add('is-invalid');
                AuthUtils.showAlert('As senhas não coincidem.', 'danger');
                return;
            }
            
            // Obter dados do formulário
            const nomeCompleto = AuthUtils.sanitizeInput(document.getElementById('nomeCompleto').value);
            const email = AuthUtils.sanitizeInput(document.getElementById('email').value);
            const telefone = AuthUtils.sanitizeInput(document.getElementById('telefone').value).replace(/\D/g, '');
            const aceitarTermos = document.getElementById('aceitarTermos').checked;
            
            if (!aceitarTermos) {
                document.getElementById('aceitarTermos').classList.add('is-invalid');
                AuthUtils.showAlert('Você deve aceitar os termos de uso e política de privacidade.', 'danger');
                return;
            }
            
            try {
                // Mostrar loading
                const submitButton = cadastroForm.querySelector('button[type="submit"]');
                AuthUtils.toggleLoading(true, submitButton);
                
                // Criar usuário
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, senha);
                const user = userCredential.user;
                
                // Atualizar perfil do usuário
                await user.updateProfile({
                    displayName: nomeCompleto
                });
                
                // Enviar e-mail de verificação
                await user.sendEmailVerification();
                
                // Criar documento do usuário no Firestore
                await AuthUtils.createUserDocument(user.uid, {
                    nome: nomeCompleto,
                    email: email,
                    telefone: telefone
                });
                
                // Mostrar mensagem de sucesso
                AuthUtils.showAlert('Conta criada com sucesso! Enviamos um e-mail de verificação para o seu endereço.', 'success');
                
                // Redirecionar após 2 segundos
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
                
            } catch (error) {
                console.error('Erro no cadastro:', error);
                
                // Traduzir mensagens de erro comuns
                let errorMessage = 'Ocorreu um erro ao criar sua conta. Tente novamente.';
                
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Este e-mail já está sendo usado por outra conta.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'E-mail inválido. Verifique o formato do e-mail.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = 'Operação não permitida. Entre em contato com o suporte.';
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
