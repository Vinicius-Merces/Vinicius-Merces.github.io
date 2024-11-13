// Importando módulos necessários do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

// Função para verificar se o usuário está autenticado
export function checkAuthState() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "index.html"; // Redireciona para a página de login
    }
}

// Função para login
export function login() {
    const email = document.getElementById("login-email").value;
    const senha = document.getElementById("login-password").value;
    
    signInWithEmailAndPassword(auth, email, senha)
        .then((userCredential) => {
            console.log('Usuário logado:', userCredential.user);
            window.location.href = "despesas.html";
        })
        .catch((error) => {
            console.error('Erro ao fazer login:', error);
            alert('Erro ao fazer login. Verifique seu e-mail e senha.');
        });
}

// Função para criar conta
export function criarConta() {
    const email = document.getElementById("signup-email").value;
    const senha = document.getElementById("signup-password").value;

    createUserWithEmailAndPassword(auth, email, senha)
        .then((userCredential) => {
            console.log('Usuário criado:', userCredential.user);
            alert('Conta criada com sucesso! Faça login.');
            window.location.href = "index.html"; 
        })
        .catch((error) => {
            console.error('Erro ao criar conta:', error);
            alert('Erro ao criar conta. Tente novamente.');
        });
}

// Função para adicionar despesa
export async function adicionarDespesa() {
    const descricao = document.getElementById('descricao').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const dataVencimento = document.getElementById('data-vencimento').value;

    if (descricao && valor && dataVencimento) {
        try {
            await addDoc(collection(db, "despesas"), {
                descricao,
                valor,
                dataVencimento,
                pago: false
            });
            alert("Despesa adicionada com sucesso!");
        } catch (e) {
            alert("Erro ao adicionar despesa.");
            console.error("Erro ao adicionar despesa: ", e);
        }
    } else {
        alert("Preencha todos os campos.");
    }
}

// Função para carregar despesas pendentes
export async function carregarDespesasPendentes() {
    const despesasRef = collection(db, "despesas");
    const q = query(despesasRef, where("pago", "==", false));
    const querySnapshot = await getDocs(q);
    const despesasPendentes = document.getElementById("despesas-pendentes");

    querySnapshot.forEach((doc) => {
        const despesa = doc.data();
        const li = document.createElement("li");
        li.textContent = `${despesa.descricao} - R$ ${despesa.valor} - Vencimento: ${despesa.dataVencimento}`;
        despesasPendentes.appendChild(li);
    });
}

// Funções para exibir gráficos de barras e linha
export function exibirGraficoBarras() {
    const ctx = document.getElementById("grafico-barras").getContext("2d");
    const myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Janeiro', 'Fevereiro', 'Março'],
            datasets: [{
                label: 'Despesas por Mês',
                data: [500, 600, 450],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        }
    });
}

export function exibirGraficoLinha() {
    const ctx = document.getElementById("grafico-linha").getContext("2d");
    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Janeiro', 'Fevereiro', 'Março'],
            datasets: [{
                label: 'Evolução das Despesas',
                data: [500, 600, 450],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        }
    });
}

export function carregarPlanejamento() {
    const planejamentoRef = collection(db, "planejamento");
    const querySnapshot = await getDocs(planejamentoRef);

    querySnapshot.forEach((doc) => {
        const planejamento = doc.data();
        document.getElementById("valor-disponivel").textContent = `Valor disponível para planejamento: R$ ${planejamento.valorDisponivel}`;
    });
}

// Função para logout
export function logout() {
    signOut(auth)
        .then(() => {
            window.location.href = "index.html"; // Redireciona para a página de login
        })
        .catch((error) => {
            console.error("Erro ao sair:", error);
        });
}
