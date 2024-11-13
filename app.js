// Importando módulos necessários do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = { /* Dados do Firebase */ };

// Inicializando o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Função para verificar se o usuário está autenticado
export function checkAuthState() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = "index.html";
    }
}

// Função para adicionar despesa
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

    addDoc(collection(db, "despesas"), {
        descricao: descricao,
        valorTotal: valorTotal,
        valorPago: 0,
        status: "pendente",
        dataVencimento: new Date(dataVencimento),
        userId: user.uid
    })
    .then(() => {
        alert("Despesa adicionada com sucesso!");
        carregarDespesasPendentes();
    })
    .catch(error => {
        console.error("Erro ao adicionar despesa:", error);
    });
}

// Função para salvar planejamento de gastos
export function salvarPlanejamento() {
    const planejamento = parseFloat(document.getElementById("planejamento").value);
    const user = auth.currentUser;

    if (!user || isNaN(planejamento) || planejamento <= 0) {
        alert("Por favor, insira um valor válido para o planejamento.");
        return;
    }

    addDoc(collection(db, "planejamentos"), {
        userId: user.uid,
        valorTotal: planejamento,
        valorRestante: planejamento
    })
    .then(() => {
        alert("Planejamento salvo com sucesso!");
        exibirValorRestante();
    })
    .catch(error => {
        console.error("Erro ao salvar planejamento:", error);
    });
}

// Função para exibir valor restante do planejamento
export function exibirValorRestante() {
    const user = auth.currentUser;

    if (!user) return;

    const planejamentoQuery = query(collection(db, "planejamentos"), where("userId", "==", user.uid));

    getDocs(planejamentoQuery)
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const planejamento = doc.data();
                document.getElementById("restante").textContent = planejamento.valorRestante.toFixed(2);
            }
        })
        .catch(error => {
            console.error("Erro ao buscar planejamento:", error);
        });
}

// Função para pagar despesa
export function pagarDespesa(despesaId, valorPago) {
    const user = auth.currentUser;
    const planejamentoQuery = query(collection(db, "planejamentos"), where("userId", "==", user.uid));

    getDocs(planejamentoQuery)
        .then(querySnapshot => {
            if (!querySnapshot.empty) {
                const docRef = querySnapshot.docs[0].ref;
                const planejamento = querySnapshot.docs[0].data();
                const novoValorRestante = planejamento.valorRestante - valorPago;

                updateDoc(docRef, { valorRestante: novoValorRestante })
                    .then(() => {
                        alert(`Despesa paga! Novo valor disponível: R$ ${novoValorRestante}`);
                        carregarDespesasPendentes();
                        exibirValorRestante();
                    })
                    .catch(error => {
                        console.error("Erro ao atualizar planejamento:", error);
                    });
            }
        })
        .catch(error => {
            console.error("Erro ao buscar planejamento:", error);
        });
}

// Função para carregar despesas pendentes
export function carregarDespesasPendentes() {
    const ul = document.getElementById("despesas-pendentes");
    ul.innerHTML = '';

    const user = auth.currentUser;
    if (!user) return;

    const despesasQuery = query(collection(db, "despesas"), where("userId", "==", user.uid), where("status", "==", "pendente"));

    getDocs(despesasQuery)
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const despesa = doc.data();
                const li = document.createElement("li");
                li.textContent = `${despesa.descricao} - R$ ${despesa.valorTotal} - Vencimento: ${despesa.dataVencimento.toDate().toLocaleDateString()}`;
                ul.appendChild(li);
            });
        })
        .catch(error => {
            console.error("Erro ao carregar despesas:", error);
        });
}
