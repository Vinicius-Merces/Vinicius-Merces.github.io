const params = new URLSearchParams(window.location.search)
const rideID = params.get("id");
const ride = getRideRecord(rideID)


document.addEventListener("DOMContentLoaded", async () =>{
const firstPosition = ride.data[0];
const fisrtLocationData = await getLocationData(firstPosition.latitude, firstPosition.longitude);


const dataElement = document.createElement("div")
dataElement.className = "flex-fill d-flex flex-column"

const cityDiv = document.createElement("div")
cityDiv.innerText = `${fisrtLocationData.city}-${fisrtLocationData.countryCode}`
cityDiv.className = "text-primary mb-2"


const maxSpeedDiv = document.createElement("div")
maxSpeedDiv.innerText = `Vel. Máxima: ${getMaxSpeed(ride.data)} Km/H`
maxSpeedDiv.className = "h5"


const distanceDiv = document.createElement("div")
distanceDiv.innerText = `Distância: ${getDistance(ride.data)} Km`

const durationDiv = document.createElement("div")
durationDiv.innerText = `Duração: ${getDuration(ride)}`

const dateDiv = document.createElement("div")
dateDiv.innerText = getStartDate(ride)
dateDiv.className = "text-secondary mt-2"

dataElement.appendChild(cityDiv)
dataElement.appendChild(maxSpeedDiv)
dataElement.appendChild(distanceDiv)
dataElement.appendChild(durationDiv)
dataElement.appendChild(dateDiv)

document.querySelector("#data").appendChild(dataElement)

})