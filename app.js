// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDzxKkfnVgH8AR2w6mrWYtxWhE2puqbCik",
    authDomain: "despesas-f60a3.firebaseapp.com",
    projectId: "despesas-f60a3",
    storageBucket: "despesas-f60a3.firebasestorage.app",
    messagingSenderId: "677878335691",
    appId: "1:677878335691:web:ec41de4f8987e95c28334e",
};

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Exemplo de uso do Firebase Auth
auth.onAuthStateChanged(user => {
    if (user) {
        console.log("Usuário logado:", user);
        loadDespesas();  // Carregar despesas se estiver logado
        loadRelatorios();  // Carregar relatórios se estiver logado
    } else {
        window.location.href = "index.html";  // Redireciona para a tela de login
    }
});

// Função para exibir a tela de boas-vindas
function showWelcomeScreen() {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("signup-form").style.display = "none";
}

// Função para mostrar o formulário de login
function showLoginForm() {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("signup-form").style.display = "none";
}

// Função para mostrar o formulário de criação de conta
function showSignupForm() {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("signup-form").style.display = "block";
}

// Função para login
function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            window.location.href = "despesas.html";  // Redireciona para a página de despesas
        })
        .catch(error => {
            alert(error.message);
        });
}

// Função para criar uma conta
function signup() {
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            window.location.href = "despesas.html";  // Redireciona para a página de despesas
        })
        .catch(error => {
            alert(error.message);
        });
}

// Função para adicionar despesa
function addDespesa() {
    const user = auth.currentUser;
    const nome = prompt("Nome da Despesa:");
    const valor = parseFloat(prompt("Valor da Despesa:"));
    const categoria = prompt("Categoria:");

    // Referência ao banco de dados
    const userRef = db.collection("users").doc(user.uid);
    
    // Adicionar despesa na coleção "despesas" do usuário
    userRef.collection("despesas").add({
        nome: nome,
        valor: valor,
        categoria: categoria,
        concluido: false
    })
    .then(() => {
        // Atualizar o valor de planejamento após adicionar despesa
        userRef.update({
            planejamento: firebase.firestore.FieldValue.increment(-valor)
        });
        alert("Despesa adicionada com sucesso!");
    })
    .catch(error => {
        alert(error.message);
    });
}

// Função para marcar despesa como concluída
function concluirDespesa(despesaId) {
    const user = auth.currentUser;
    const userRef = db.collection("users").doc(user.uid);
    const despesaRef = userRef.collection("despesas").doc(despesaId);

    // Atualiza o status da despesa para "concluída"
    despesaRef.update({
        concluido: true
    })
    .then(() => {
        // Atualiza o valor de planejamento após marcar como concluída
        despesaRef.get().then(doc => {
            const valor = doc.data().valor;
            userRef.update({
                planejamento: firebase.firestore.FieldValue.increment(-valor)
            });
            alert("Despesa concluída e valor debitado do planejamento!");
        });
    })
    .catch(error => {
        alert(error.message);
    });
}

// Função para carregar despesas e valor de planejamento
function loadDespesas() {
    const user = auth.currentUser;
    const userRef = db.collection("users").doc(user.uid);

    // Carregar valor de planejamento
    userRef.get().then(doc => {
        const data = doc.data();
        document.getElementById("planejamento").innerText = `R$ ${data.planejamento}`;
    });

    // Carregar despesas
    userRef.collection("despesas").get().then(querySnapshot => {
        let despesasList = document.getElementById("despesas-list");
        despesasList.innerHTML = ""; // Limpar lista existente

        querySnapshot.forEach(doc => {
            const despesa = doc.data();
            const despesaItem = document.createElement("div");
            despesaItem.innerHTML = `
                <p><strong>${despesa.nome}</strong> - R$ ${despesa.valor} (${despesa.categoria})</p>
                <button onclick="concluirDespesa('${doc.id}')">Concluir</button>
            `;
            despesasList.appendChild(despesaItem);
        });
    });
}

// Função para carregar os relatórios
function loadRelatorios() {
    const user = auth.currentUser;
    const userRef = db.collection("users").doc(user.uid);
    const despesasRef = userRef.collection("despesas");

    let totalGasto = 0;
    let totalPlanejado = 0;

    // Carregar despesas para calcular o total gasto
    despesasRef.get().then(querySnapshot => {
        querySnapshot.forEach(doc => {
            const despesa = doc.data();
            if (despesa.concluido) {
                totalGasto += despesa.valor;
            }
        });

        // Carregar o valor planejado
        userRef.get().then(doc => {
            totalPlanejado = doc.data().planejamento;

            // Exibir gráfico
            renderChart(totalPlanejado, totalGasto);
        });
    });
}

// Função para exibir o gráfico
function renderChart(planejado, gasto) {
    const ctx = document.getElementById('grafico').getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Planejamento', 'Gasto'],
            datasets: [{
                label: 'Comparação',
                data: [planejado, gasto],
                backgroundColor: ['#36a2eb', '#ff6384']
            }]
        }
    });
}