import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDzxKkfnVgH8AR2w6mrWYtxWhE2puqbCik",
    authDomain: "despesas-f60a3.firebaseapp.com",
    projectId: "despesas-f60a3",
    storageBucket: "despesas-f60a3.firebasestorage.app",
    messagingSenderId: "677878335691",
    appId: "1:677878335691:web:ec41de4f8987e95c28334e",
    measurementId: "G-1N7LB9LZQM"
};

// Inicializando o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Função para verificar o estado de autenticação
export function checkAuthState(redirect = false) {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, user => {
            if (user) {
                resolve(user);
            } else {
                if (redirect) {
                    reject();
                } else {
                    resolve(null);
                }
            }
        });
    });
}

// Função de login
export function login() {
    const email = prompt('Digite seu e-mail');
    const senha = prompt('Digite sua senha', '', 'password'); // Agora usando "password" para ocultar a senha

    signInWithEmailAndPassword(auth, email, senha)
        .then(userCredential => {
            console.log('Usuário logado:', userCredential.user);
            window.location.href = 'despesas.html'; // Redireciona para a página de despesas
        })
        .catch(error => {
            console.error('Erro ao fazer login:', error);
            alert('Erro ao fazer login. Verifique seu e-mail e senha.');
        });
}

// Função de criação de conta
export function criarConta() {
    const email = prompt('Digite seu e-mail');
    const senha = prompt('Digite sua senha', '', 'password'); // Usando "password" aqui também

    createUserWithEmailAndPassword(auth, email, senha)
        .then(userCredential => {
            console.log('Usuário criado:', userCredential.user);
            alert('Conta criada com sucesso! Agora faça login.');
        })
        .catch(error => {
            console.error('Erro ao criar conta:', error);
            alert('Erro ao criar conta. Verifique os dados fornecidos.');
        });
}

// Função de logout
export function logout() {
    signOut(auth)
        .then(() => {
            console.log('Usuário deslogado');
            window.location.href = 'index.html'; // Redireciona para a página de login após logout
        })
        .catch(error => {
            console.error('Erro ao fazer logout:', error);
        });
}

// Função para adicionar despesas
export async function adicionarDespesa(descricao, valor) {
    const user = await checkAuthState();
    if (user) {
        try {
            // Adiciona a despesa
            await addDoc(collection(db, "despesas"), {
                descricao: descricao,
                valor: valor,
                usuario: user.email,
                data: new Date()
            });
            console.log('Despesa adicionada com sucesso!');

            // Atualiza o valor do planejamento de gastos
            const planejamentoDoc = await carregarPlanejamentoFirebase();
            if (planejamentoDoc) {
                const valorRestante = planejamentoDoc.valorRestante - valor;
                await salvarPlanejamentoFirebase(valorRestante); // Atualiza o planejamento no Firebase
                console.log('Planejamento atualizado com sucesso!');
            }
        } catch (error) {
            console.error('Erro ao adicionar despesa:', error);
        }
    }
}

// Função para carregar despesas pendentes
export async function carregarDespesasPendentes() {
    const user = await checkAuthState();
    if (user) {
        try {
            const q = query(collection(db, "despesas"), where("usuario", "==", user.email));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                console.log(doc.id, " => ", doc.data());
            });
        } catch (error) {
            console.error('Erro ao carregar despesas pendentes:', error);
        }
    }
}

// Função para carregar o planejamento de gastos do Firebase
export async function carregarPlanejamentoFirebase() {
    const user = await checkAuthState();
    const planejamentoRef = doc(db, 'planejamentos', user.uid); // Usa o ID do usuário como chave
    const planejamentoDoc = await getDoc(planejamentoRef);

    if (planejamentoDoc.exists()) {
        return planejamentoDoc.data(); // Retorna os dados do planejamento
    } else {
        console.log('Planejamento não encontrado!');
        return null;
    }
}

// Função para salvar o planejamento de gastos no Firebase
export async function salvarPlanejamentoFirebase(valorRestante) {
    const user = await checkAuthState();
    const planejamentoRef = doc(db, 'planejamentos', user.uid); // Usa o ID do usuário como chave
    await setDoc(planejamentoRef, {
        valorRestante: valorRestante
    });
    console.log('Planejamento salvo com sucesso!');
}
