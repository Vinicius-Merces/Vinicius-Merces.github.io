// Importação do Firebase
import { getFirestore, doc, getDoc, collection, addDoc, setDoc, getDocs } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js';

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

// Função para verificar autenticação
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

// Função otimizada para buscar dados do Firebase
async function fetchDataFromDoc(docRef) {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return docSnap.data();
    throw new Error("Documento não encontrado.");
}

// Função para criar conta de forma segura
export async function criarConta(email, senha) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(auth, email, senha);
        alert(`Conta criada com sucesso! Bem-vindo, ${userCredential.user.email}`);
        window.location.href = 'despesas.html';
    } catch (error) {
        console.error("Erro ao criar conta:", error);
        alert("Erro ao criar conta. Verifique seus dados.");
    }
}

// Função para carregar planejamento de forma eficiente
export async function carregarPlanejamentoFirebase() {
    try {
        const planejamentoRef = doc(db, 'planejamento', 'planejamentoId');
        return await fetchDataFromDoc(planejamentoRef);
    } catch (error) {
        console.error("Erro ao carregar planejamento:", error);
        throw new Error("Erro ao carregar planejamento. Tente novamente.");
    }
}

// Função para carregar despesas pendentes com segurança
export async function carregarDespesasPendentes() {
    try {
        const despesasRef = collection(db, 'despesas');
        const querySnapshot = await getDocs(despesasRef);
        return querySnapshot.docs
            .map(doc => doc.data())
            .filter(despesa => despesa.status === 'pendente');
    } catch (error) {
        console.error("Erro ao carregar as despesas:", error);
        throw new Error("Erro ao carregar as despesas. Tente novamente.");
    }
}

// Função para adicionar despesa com feedback visual
export async function adicionarDespesa(descricao, valor, dataVencimento) {
    try {
        const despesasRef = collection(db, 'despesas');
        const loading = document.getElementById('loading');
        loading.style.display = 'block'; // Mostra o indicador de carregamento

        await addDoc(despesasRef, { descricao, valor, dataVencimento, status: 'pendente' });

        loading.style.display = 'none'; // Esconde o indicador de carregamento
    } catch (error) {
        console.error("Erro ao adicionar despesa:", error);
        alert("Erro ao adicionar despesa. Tente novamente.");
    }
}

// Função para salvar o planejamento com feedback visual
export async function salvarPlanejamentoFirebase(valorPlanejado) {
    try {
        const planejamentoRef = doc(db, 'planejamento', 'planejamentoId');
        await setDoc(planejamentoRef, { valorPlanejado });
        alert('Planejamento salvo com sucesso!');
    } catch (error) {
        console.error("Erro ao salvar planejamento:", error);
        alert("Erro ao salvar planejamento. Tente novamente.");
    }
}

// Função de logout com feedback ao usuário
export function logout() {
    signOut(auth).then(() => {
        alert('Você saiu com sucesso!');
        window.location.href = 'index.html';
    }).catch(error => {
        console.error("Erro ao fazer logout:", error);
        alert("Erro ao fazer logout. Tente novamente.");
    });
}

// Função de carregamento do planejamento na página
export async function carregarPlanejamentoNaPagina() {
    try {
        const planejamentoDoc = await carregarPlanejamentoFirebase();
        const valorPlanejado = planejamentoDoc.valorPlanejado;
        document.getElementById('valor-restante').textContent = `Valor restante: R$ ${valorPlanejado.toFixed(2)}`;
        document.getElementById('valor-planejamento').value = valorPlanejado;
    } catch (error) {
        console.error("Erro ao carregar planejamento:", error);
        alert("Erro ao carregar planejamento. Tente novamente.");
    }
}

// Função para carregar despesas pendentes de forma eficiente
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
        alert("Erro ao carregar despesas. Tente novamente.");
    }
}
