
async function getLocationData (latitude, longitude) {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    const response = await fetch(url)
    return await response.json()
}

function getMaxSpeed(positions){
    let maxSpeed = 0
    positions.forEach(position=>{
        if(position.speed != null && position.speed > maxSpeed)
        maxSpeed = position.speed
    })

    return (maxSpeed * 3.6).toFixed(0)
}

function getDistance(position) {
    const earthRadiusKm = 6371;
    let totalDistance = 0;

    for (let i = 0; i < position.length - 1; i++) {
        const p1 = {
            latitude: position[i].latitude,
            longitude: position[i].longitude
        };
        const p2 = {
            latitude: position[i + 1].latitude,
            longitude: position[i + 1].longitude
        };

        const deltaLatitude = toRad(p2.latitude - p1.latitude);
        const deltaLongitude = toRad(p2.longitude - p1.longitude);

        const a = Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
                  Math.cos(toRad(p1.latitude)) * Math.cos(toRad(p2.latitude)) *
                  Math.sin(deltaLongitude / 2) * Math.sin(deltaLongitude / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distance = earthRadiusKm * c;
        totalDistance += distance;

        if (isNaN(p1.latitude) || isNaN(p1.longitude) || isNaN(p2.latitude) || isNaN(p2.longitude)) {
            console.error("Coordenadas inválidas:", p1, p2);
        }

    }

    function toRad(degree) {
        return degree * Math.PI / 180;
    }

    return totalDistance.toFixed(1);
}

function getDuration(ride){ 

    function format(number, digits) {
        return String(number.toFixed(0)).padStart(2, '0')
    }
    
    const interval = (ride.stopTime - ride.startTime) / 1000
    const minutes = interval /60
    const seconds = interval % 60
    return `${format(minutes, 2)}:${format(seconds, 2)}`
}

function getStartDate(ride){
    const d = new Date(ride.startTime)

    const day = d.toLocaleString("pt-BR",  {day:"numeric"})
    const month = d.toLocaleString("pt-BR",  {month:"numeric"})
    const year = d.toLocaleString("pt-BR",  {year:"numeric"})

    const hour = d.toLocaleString("pt-BR",  {hour:"2-digit"})
    const minute = d.toLocaleString("pt-BR",  {minute:"2-digit"})


    return `${day}/${month}/${year} - ${hour}:${minute}`
}