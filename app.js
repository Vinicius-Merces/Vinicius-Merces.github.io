// Importação do Firebase com melhorias na estrutura de importação
import { getFirestore, doc, getDoc, collection, addDoc, setDoc, getDocs } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut, initializeApp } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyDzxKkfnVgH8AR2w6mrWYtxWhE2puqbCik",
    authDomain: "despesas-f60a3.firebaseapp.com",
    projectId: "despesas-f60a3",
    storageBucket: "despesas-f60a3.firebasestorage.app",
    messagingSenderId: "677878335691",
    appId: "1:677878335691:web:ec41de4f8987e95c28334e",
    measurementId: "G-1N7LB9LZQM"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Função para verificar autenticação com promessas melhoradas
export function checkAuthState(redirect = false) {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, user => {
            if (user) {
                document.getElementById('user-name').textContent = `Olá, ${user.displayName || user.email}`;
                toggleAuthButtons(true);
                resolve(user);
            } else {
                if (redirect) window.location.href = 'index.html';
                reject();
            }
        });
    });
}

// Refatoração para melhor manipulação de erros
async function fetchDataFromDoc(docRef) {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    throw new Error("Document not found.");
}

// Função para carregar planejamento com código mais limpo
export async function carregarPlanejamentoFirebase() {
    try {
        const planejamentoRef = doc(db, 'planejamento', 'planejamentoId');
        return await fetchDataFromDoc(planejamentoRef);
    } catch (error) {
        console.error("Erro ao carregar o planejamento:", error);
        throw error;
    }
}

// Função para carregar despesas pendentes com código otimizado
export async function carregarDespesasPendentes() {
    try {
        const despesasRef = collection(db, 'despesas');
        const querySnapshot = await getDocs(despesasRef);
        return querySnapshot.docs
            .map(doc => doc.data())
            .filter(despesa => despesa.status === 'pendente');
    } catch (error) {
        console.error("Erro ao carregar as despesas:", error);
        throw error;
    }
}

// Função para adicionar despesa de maneira otimizada
export async function adicionarDespesa(descricao, valor, dataVencimento) {
    try {
        const despesasRef = collection(db, 'despesas');
        await addDoc(despesasRef, { descricao, valor, dataVencimento, status: 'pendente' });
    } catch (error) {
        console.error("Erro ao adicionar a despesa:", error);
        throw error;
    }
}

// Função para salvar planejamento com melhorias
export async function salvarPlanejamentoFirebase(valorPlanejado) {
    try {
        const planejamentoRef = doc(db, 'planejamento', 'planejamentoId');
        await setDoc(planejamentoRef, { valorPlanejado });
    } catch (error) {
        console.error("Erro ao salvar planejamento:", error);
        throw error;
    }
}

// Função de logout
export function logout() {
    signOut(auth).then(() => window.location.href = 'index.html')
        .catch(error => console.error("Erro ao fazer logout:", error));
}

// Função de atualização visual do planejamento na página
export async function carregarPlanejamentoNaPagina() {
    try {
        const planejamentoDoc = await carregarPlanejamentoFirebase();
        const valorPlanejado = planejamentoDoc.valorPlanejado;
        document.getElementById('valor-restante').textContent = `Valor restante: R$ ${valorPlanejado.toFixed(2)}`;
        document.getElementById('valor-planejamento').value = valorPlanejado;
    } catch (error) {
        console.error("Erro ao carregar planejamento:", error);
    }
}

// Função para atualizar lista de despesas pendentes de forma eficiente
export async function carregarDespesasPendentesNaPagina() {
    try {
        const despesasPendentes = await carregarDespesasPendentes();
        const listaDespesas = document.getElementById('despesas-pendentes');
        listaDespesas.innerHTML = '';
        despesasPendentes.forEach(despesa => {
            const li = document.createElement('li');
            li.textContent = `${despesa.descricao} - R$ ${despesa.valor} (Vencimento: ${new Date(despesa.dataVencimento).toLocaleDateString()})`;
            listaDespesas.appendChild(li);
        });
    } catch (error) {
        console.error("Erro ao carregar despesas pendentes:", error);
    }
}
