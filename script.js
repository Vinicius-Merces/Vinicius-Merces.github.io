// Carne - 400gr/pessoa + de 6 horas = 650gr/pessoa
// Cerveja 1200ml/pessoa + de 6 horas = 2000ml/pessoa
//Refrigerante/agua 1000ml + de 6 horas = 1500ml

// Crianças valem por 0,5

let inputAdultos= document.getElementById("adultos");
let inputCriancas= document.getElementById("criancas");
let inputDuracao= document.getElementById("duracao");
let resultado = document.getElementById("resultado");
let balao = document.getElementsByClassName("balao");

function calcular(){
    console.log("Calculando...")
    
    let adultos = inputAdultos.value;
    let criancas = inputCriancas.value;
    let duracao = inputDuracao.value;
    

    let qtdTotalCarne = carnepp(duracao) * adultos + (carnepp(duracao)/2 * criancas);
    let qtdTotalCerveja = cervejapp(duracao) * adultos ;
    let qtdTotalBebidas = bebidaspp(duracao) * adultos + (bebidaspp(duracao)/2 * criancas);
    
    resultado.innerHTML = `<p>Vai precisar de:</p>`
    resultado.innerHTML += `<p>${qtdTotalCarne/1000} Kg de Carne</p>`
    resultado.innerHTML += `<p>${Math.ceil(qtdTotalCerveja/355)} Latas(355ml) de Cerveja</p>`
    resultado.innerHTML += `<p>${Math.ceil(qtdTotalBebidas/2000)} Garrafas(2L) de Bebidas</p>`

    resultado.style.fontSize = "2rem";
    resultado.style.lineHeight = "0.6em";
}

function carnepp(duracao){
    let carne = 400;
    if(duracao >= 6) {
        return 650;
    } else {
        return 400;
    }
}
function cervejapp(duracao){
    let carne = 1200;
    if(duracao >= 6) {
        return 2000;
    } else {
        return 1200;
    }
}
function bebidaspp(duracao){
    let carne = 1000;
    if(duracao >= 6) {
        return 1500;
    } else {
        return 1000;
    }
}