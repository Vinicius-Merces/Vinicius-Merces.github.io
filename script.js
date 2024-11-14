 // Configuração do Firebase
 const firebaseConfig = {
    apiKey: "AIzaSyDzxKkfnVgH8AR2w6mrWYtxWhE2puqbCik",
    authDomain: "despesas-f60a3.firebaseapp.com",
    projectId: "despesas-f60a3",
    storageBucket: "despesas-f60a3.firebasestorage.app",
    messagingSenderId: "677878335691",
    appId: "1:677878335691:web:ec41de4f8987e95c28334e",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Verifica o estado de autenticação do usuário ao carregar a página
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById("login-page").style.display = "none";
        document.getElementById("despesas-page").style.display = "block";
        loadDespesas();
        loadRelatorios();
    } else {
        document.getElementById("login-page").style.display = "block";
        document.getElementById("despesas-page").style.display = "none";
    }
});

// Função de login
function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            document.getElementById("email").value = "";
            document.getElementById("password").value = "";
        })
        .catch(error => alert("Erro ao fazer login: " + error.message));
}

// Função para criar nova conta
function signUp() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            const userRef = db.collection("users").doc(user.uid);
            userRef.set({ planejamento: 0 });
            document.getElementById("email").value = "";
            document.getElementById("password").value = "";
        })
        .catch(error => alert("Erro ao criar conta: " + error.message));
}

function loadDespesas() {
    const user = auth.currentUser;
    const userRef = db.collection("users").doc(user.uid);
    const despesasRef = userRef.collection("despesas");

    despesasRef.get().then(querySnapshot => {
        let despesasList = "";
        querySnapshot.forEach(doc => {
            const despesa = doc.data();
            const data = despesa.data;
            let dataFormatada = data && data.toDate ? data.toDate().toLocaleDateString() : "Data inválida";
            let concluidoButton = despesa.concluido ? "" : `<button class="btn btn-success" onclick="concluirDespesa('${doc.id}', ${despesa.valor})">Concluir</button>`;
            despesasList += `
                <div class="mb-3">
                    <strong>${despesa.nome}</strong><br>
                    Valor: R$ ${despesa.valor.toFixed(2)}<br>
                    Data: ${dataFormatada}<br>
                    ${concluidoButton}
                    <button class="btn btn-danger" onclick="deleteDespesa('${doc.id}')">Excluir</button>
                </div>
            `;
        });
        document.getElementById("despesas-list").innerHTML = despesasList;
    }).catch(error => console.error("Erro ao carregar as despesas:", error));

    userRef.get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById("planejamento").textContent = `R$ ${data.planejamento.toFixed(2)}`;
        } else {
            userRef.set({ planejamento: 0 });
            document.getElementById("planejamento").textContent = "R$ 0.00";
        }
    }).catch(error => console.error("Erro ao carregar o planejamento:", error));
}

function addDespesa() {
    const user = auth.currentUser;
    const userRef = db.collection("users").doc(user.uid);
    const despesasRef = userRef.collection("despesas");

    const nomeDespesa = prompt("Digite o nome da despesa:");
    const valorDespesa = parseFloat(prompt("Digite o valor da despesa:"));

    if (nomeDespesa && !isNaN(valorDespesa)) {
        despesasRef.add({
            nome: nomeDespesa,
            valor: valorDespesa,
            data: firebase.firestore.Timestamp.now(),
            concluido: false
        }).then(() => loadDespesas())
          .catch(error => alert("Erro ao adicionar despesa: " + error.message));
    } else {
        alert("Nome ou valor inválido.");
    }
}

function addPlanejamento() {
    const user = auth.currentUser;
    const userRef = db.collection("users").doc(user.uid);
    const valorPlanejamento = parseFloat(prompt("Digite o valor do planejamento:"));

    if (!isNaN(valorPlanejamento)) {
        userRef.update({ planejamento: firebase.firestore.FieldValue.increment(valorPlanejamento) })
            .then(() => loadDespesas())
            .catch(error => alert("Erro ao atualizar planejamento: " + error.message));
    } else {
        alert("Valor inválido.");
    }
}

function concluirDespesa(id, valor) {
    const user = auth.currentUser;
    const userRef = db.collection("users").doc(user.uid);
    const despesaRef = userRef.collection("despesas").doc(id);

    despesaRef.update({ concluido: true })
        .then(() => loadDespesas())
        .catch(error => alert("Erro ao concluir despesa: " + error.message));
}

function deleteDespesa(id) {
    const user = auth.currentUser;
    const userRef = db.collection("users").doc(user.uid);
    const despesaRef = userRef.collection("despesas").doc(id);

    despesaRef.delete()
        .then(() => loadDespesas())
        .catch(error => alert("Erro ao excluir despesa: " + error.message));
}

function loadRelatorios() {
    const user = auth.currentUser;
    const periodo = parseInt(document.getElementById("periodo").value);
    const userRef = db.collection("users").doc(user.uid);
    const despesasRef = userRef.collection("despesas");

    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - periodo);

    despesasRef.where("concluido", "==", true)
        .where("data", ">=", dataInicio)
        .get().then(querySnapshot => {
            const despesasConcluidas = [];
            querySnapshot.forEach(doc => despesasConcluidas.push(doc.data().valor));

            const ctx = document.getElementById("grafico").getContext("2d");

            if (window.grafico instanceof Chart) {
                window.grafico.destroy();
            }

            const totalDespesas = despesasConcluidas.reduce((acc, valor) => acc + valor, 0);

            userRef.get().then(doc => {
                const data = doc.data();
                const planejamento = data && data.planejamento !== undefined ? data.planejamento : 0;

                window.grafico = new Chart(ctx, {
                    type: "bar",
                    data: {
                        labels: ["Planejamento", "Despesas Concluídas"],
                        datasets: [{
                            label: "Valor em R$",
                            data: [planejamento, totalDespesas],
                            backgroundColor: ["#4CAF50", "#F44336"]
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: "top" },
                            title: { display: true, text: "Relatório de Despesas" }
                        }
                    }
                });
            }).catch(error => alert("Erro ao carregar planejamento: " + error.message));
        }).catch(error => alert("Erro ao carregar relatório: " + error.message));
}

function logout() {
    auth.signOut().catch(error => alert("Erro ao sair: " + error.message));
}
