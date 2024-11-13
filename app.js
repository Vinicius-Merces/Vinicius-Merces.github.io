// Importando módulos necessários do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// Função de verificação de estado de autenticação (agora retorna uma Promise)
export function checkAuthState(redirect = false) {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Se estiver logado, resolve a Promise
                resolve(user);
            } else {
                // Se não estiver logado, rejeita a Promise
                if (redirect) {
                    reject("Usuário não autenticado");
                }
            }
        });
    });
}

// Função para adicionar uma nova despesa
export function adicionarDespesa() {
    const descricao = document.getElementById("descricao").value;
    const valorTotal = parseFloat(document.getElementById("valor").value);
    const dataVencimento = document.getElementById("data-vencimento").value;

    if (!descricao || isNaN(valorTotal) || !dataVencimento) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("Você precisa estar logado para adicionar despesas!");
        return;
    }

    // Adiciona a despesa ao banco de dados com o UID do usuário
    addDoc(collection(db, "despesas"), {
        descricao: descricao,
        valorTotal: valorTotal,
        valorPago: 0,
        status: "pendente",
        dataVencimento: new Date(dataVencimento),
        userId: user.uid // Associando a despesa ao usuário logado
    })
    .then(() => {
        alert("Despesa adicionada com sucesso!");
        carregarDespesasPendentes();
    })
    .catch(error => {
        console.error("Erro ao adicionar despesa:", error);
    });
}

// Função para carregar as despesas pendentes
export function carregarDespesasPendentes() {
    const ul = document.getElementById("despesas-pendentes");
    ul.innerHTML = '';  // Limpa a lista

    const user = auth.currentUser;
    if (!user) {
        alert("Você precisa estar logado para ver suas despesas!");
        return;
    }

    // Carrega as despesas do usuário logado
    const despesasQuery = query(collection(db, "despesas"), where("userId", "==", user.uid), where("status", "==", "pendente"));

    getDocs(despesasQuery)
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const despesa = doc.data();
                const li = document.createElement("li");
                li.textContent = `${despesa.descricao} - R$ ${despesa.valorTotal} - Vencimento: ${despesa.dataVencimento.toLocaleDateString()}`;
                ul.appendChild(li);
            });
        })
        .catch(error => {
            console.error("Erro ao carregar despesas:", error);
        });
}

// Função de login
export function login() {
    const email = prompt('Digite seu e-mail');
    const senha = prompt('Digite sua senha');
    
    signInWithEmailAndPassword(auth, email, senha)
        .then(userCredential => {
            console.log('Usuário logado:', userCredential.user);
        })
        .catch(error => {
            console.error('Erro ao fazer login:', error);
            alert('Erro ao fazer login. Verifique seu e-mail e senha.');
        });
}

// Função de criação de conta
export function criarConta() {
    const email = prompt('Digite seu e-mail');
    const senha = prompt('Digite sua senha');

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
        })
        .catch(error => {
            console.error('Erro ao fazer logout:', error);
        });
}

// Função para exibir as despesas pendentes ao carregar a página
if (window.location.pathname.includes('despesas.html')) {
    checkAuthState(true).then(() => {
        carregarDespesasPendentes();
    }).catch(() => {
        window.location.href = "index.html";  // Redireciona para a página Home se não estiver logado
    });
}

// Função para carregar os dados do planejamento
export function carregarPlanejamento() {
    const user = auth.currentUser;
    if (!user) {
        alert("Você precisa estar logado para ver o planejamento.");
        return;
    }

    const planejamentoRef = collection(db, "planejamentos");
    const planejamentoQuery = query(planejamentoRef, where("userId", "==", user.uid));

    getDocs(planejamentoQuery)
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const planejamento = doc.data();
                const valorRestante = planejamento.valorPlanejamento - planejamento.valorPago;
                document.getElementById("valor-restante").textContent = `R$ ${valorRestante.toFixed(2)}`;
            });
        })
        .catch(error => {
            console.error("Erro ao carregar o planejamento:", error);
        });
}
