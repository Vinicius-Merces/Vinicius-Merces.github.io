// Importando o Firebase
import { getFirestore, doc, getDocs, collection } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.10.0/firebase-auth.js';

// Configuração do Firebase (substitua com suas credenciais do Firebase)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_AUTH_DOMAIN",
    projectId: "SEU_PROJECT_ID",
    storageBucket: "SEU_STORAGE_BUCKET",
    messagingSenderId: "SEU_MESSAGING_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Inicializando o Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Função para verificar o estado de autenticação do usuário
export function checkAuthState(redirect = false) {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Usuário logado
                document.getElementById('user-name').textContent = `Olá, ${user.displayName || user.email}`;
                document.getElementById('login-btn').style.display = 'none';
                document.getElementById('create-account-btn').style.display = 'none';
                document.getElementById('logout-btn').style.display = 'inline-block';
                resolve(user);
            } else {
                // Usuário não logado
                if (redirect) {
                    window.location.href = 'index.html'; // Redireciona para a página inicial se não estiver logado
                }
                reject();
            }
        });
    });
}

// Função para carregar o planejamento de gastos do Firebase
export async function carregarPlanejamentoFirebase() {
    try {
        const planejamentoRef = doc(db, 'planejamento', 'planejamentoId'); // Substitua com o ID real
        const docSnap = await getDocs(planejamentoRef);
        
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            throw new Error("Planejamento não encontrado.");
        }
    } catch (error) {
        console.error("Erro ao carregar o planejamento:", error);
        throw error;
    }
}

// Função para carregar as despesas pendentes do Firebase
export async function carregarDespesasPendentes() {
    try {
        const despesasRef = collection(db, 'despesas');
        const querySnapshot = await getDocs(despesasRef);
        const despesas = [];
        
        querySnapshot.forEach((doc) => {
            despesas.push(doc.data());
        });

        return despesas.filter(despesa => despesa.status === 'pendente'); // Filtrando despesas pendentes
    } catch (error) {
        console.error("Erro ao carregar as despesas:", error);
        throw error;
    }
}

// Função para adicionar uma despesa ao Firebase
export async function adicionarDespesa(descricao, valor, dataVencimento) {
    try {
        const despesasRef = collection(db, 'despesas');
        await addDoc(despesasRef, {
            descricao: descricao,
            valor: valor,
            dataVencimento: dataVencimento,
            status: 'pendente'
        });
    } catch (error) {
        console.error("Erro ao adicionar a despesa:", error);
        throw error;
    }
}

// Função para salvar o planejamento de gastos no Firebase
export async function salvarPlanejamentoFirebase(valorPlanejado) {
    try {
        const planejamentoRef = doc(db, 'planejamento', 'planejamentoId'); // Substitua com o ID real
        await setDoc(planejamentoRef, {
            valorPlanejado: valorPlanejado
        });
    } catch (error) {
        console.error("Erro ao salvar planejamento:", error);
        throw error;
    }
}

// Função para logout do usuário
export function logout() {
    signOut(auth).then(() => {
        window.location.href = 'index.html'; // Redireciona para a página inicial após logout
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}

// Função para carregar as despesas pendentes e o planejamento de gastos ao acessar a página de despesas
export async function carregarDespesasPendentesNaPagina() {
    try {
        const despesasPendentes = await carregarDespesasPendentes();
        const listaDespesas = document.getElementById('despesas-pendentes');
        listaDespesas.innerHTML = ''; // Limpa a lista antes de adicionar os itens
        despesasPendentes.forEach(despesa => {
            const li = document.createElement('li');
            li.textContent = `${despesa.descricao} - R$ ${despesa.valor} (Vencimento: ${new Date(despesa.dataVencimento).toLocaleDateString()})`;
            listaDespesas.appendChild(li);
        });
    } catch (error) {
        console.error("Erro ao carregar despesas pendentes:", error);
    }
}

// Função para carregar o planejamento de gastos na página de despesas
export async function carregarPlanejamentoNaPagina() {
    try {
        const planejamentoDoc = await carregarPlanejamentoFirebase();
        const valorPlanejadoInput = document.getElementById('valor-planejamento');
        const valorRestanteEl = document.getElementById('valor-restante');

        if (planejamentoDoc) {
            valorPlanejado = planejamentoDoc.valorPlanejado;
            valorRestante = valorPlanejado;
            valorRestanteEl.textContent = `Valor restante: R$ ${valorRestante.toFixed(2)}`;
            valorPlanejadoInput.value = valorPlanejado;
        }
    } catch (error) {
        console.error("Erro ao carregar planejamento:", error);
    }
}
