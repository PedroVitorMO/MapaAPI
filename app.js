// Importações diretas dos SDKs modulares do Firebase v10 via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configurações do seu Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBisJ619H5TnAaHE8-0Os7aWPSRnstQko4",
    authDomain: "interfatecs-762ad.firebaseapp.com",
    databaseURL: "https://interfatecs-762ad-default-rtdb.firebaseio.com",
    projectId: "interfatecs-762ad",
    storageBucket: "interfatecs-762ad.firebasestorage.app",
    messagingSenderId: "1084587763589",
    appId: "1:1084587763589:web:0930a2ebfc5c7bda1c86ec",
    measurementId: "G-NSWXWK84TY"
};

// Inicialização do Firebase Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Token de Acesso do seu Mapbox
mapboxgl.accessToken = 'pk.eyJ1IjoicGVkcm8tdml0b3IwMSIsImEiOiJjbXBmcHdhODYwaHo0MnBwb3h3NjlycHJqIn0.voIiCSVg2r3LcGcyyVaDkw';

let map;
let userLocation = null;
let locationsData = [];

// DICIONÁRIO DE CONFIGURAÇÃO: Cores e ícones FontAwesome
const tipoConfig = {
    "bombeiro":    { cor: "#ff4444", icone: "fa-solid fa-fire" },
    "delegacia":   { cor: "#3b5998", icone: "fa-solid fa-shield-halved" },
    "faculdade":   { cor: "#0073e6", icone: "fa-solid fa-graduation-cap" },
    "hospital":    { cor: "#00cc66", icone: "fa-solid fa-hospital" },
    "hotel":       { cor: "#9933ff", icone: "fa-solid fa-bed" },
    "pousada":     { cor: "#ff66cc", icone: "fa-solid fa-hotel" },
    "lanchonete":  { cor: "#ff9900", icone: "fa-solid fa-burger" },
    "restaurante": { cor: "#cc0000", icone: "fa-solid fa-utensils" },
    "geral":       { cor: "#888888", icone: "fa-solid fa-location-dot" }
};

// Inicialização das configurações do mapa Mapbox
function initMap() {
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11', 
        center: [-49.64959, -22.20720], // Centralizado diretamente nas coordenadas de Garça
        zoom: 14
    });

    map.addControl(new mapboxgl.NavigationControl());
    getUserLocation();
}

// Captura a localização atual (GPS) do usuário
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = [position.coords.longitude, position.coords.latitude];
                
                new mapboxgl.Marker({ color: '#00aaee' })
                    .setLngLat(userLocation)
                    .setPopup(new mapboxgl.Popup().setHTML('<h3>Você está aqui</h3>'))
                    .addTo(map);

                loadFirebaseData();
            },
            (error) => {
                console.warn("Acesso ao GPS indisponível. Carregando dados padrão...", error);
                loadFirebaseData();
            }
        );
    } else {
        loadFirebaseData();
    }
}

// Busca os pontos cadastrados no Cloud Firestore usando o formato Geopoint puro
async function loadFirebaseData() {
    const loadingEl = document.getElementById('loading');
    try {
        const querySnapshot = await getDocs(collection(db, "Tabela LOCAL"));
        
        if (querySnapshot.empty) {
            loadingEl.innerHTML = "Nenhum local cadastrado na coleção 'Tabela LOCAL'.";
            return;
        }

        locationsData = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            let geoPoint = data.coordenadas; // Seu campo do tipo geopoint
            
            let nomeLocal = data.nome || data.Nome || doc.id;
            let tipoId = data.tipo_id || data.tipo || "geral";
            tipoId = tipoId.toLowerCase().trim();

            // Leitura direta e sem falhas dos campos numéricos nativos do Firebase
            if (geoPoint && typeof geoPoint.latitude === 'number' && typeof geoPoint.longitude === 'number') {
                locationsData.push({
                    id: doc.id,
                    nome: nomeLocal,
                    tipo_id: tipoId,
                    lat: geoPoint.latitude,
                    lng: geoPoint.longitude
                });
            }
        });

        if (locationsData.length === 0) {
            loadingEl.innerHTML = "Aviso: Altere o campo 'coordenadas' para o tipo 'geopoint' em todos os documentos do seu banco.";
            return;
        }

        loadingEl.style.display = 'none';
        renderPlacesList(locationsData);
        plotMarkers(locationsData);

    } catch (error) {
        console.error("Erro ao conectar com Firestore:", error);
        loadingEl.innerHTML = "Erro ao carregar dados do Firebase.";
    }
}

// Renderiza a lista na barra lateral esquerda
function renderPlacesList(places) {
    const listEl = document.getElementById('places-list');
    listEl.innerHTML = '';
    
    places.forEach(place => {
        const config = tipoConfig[place.tipo_id] || tipoConfig["geral"];

        const li = document.createElement('li');
        li.className = 'place-item';
        li.innerHTML = `
            <div class="place-name">
                <i class="${config.icone}" style="color: ${config.cor}; margin-right: 8px; width: 18px; text-align: center;"></i>
                ${place.nome}
            </div>
            <div class="place-type" style="margin-left: 26px;">tipo_id: <b>${place.tipo_id}</b></div>
        `;
        
        li.addEventListener('click', () => {
            document.querySelectorAll('.place-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            onPlaceSelect(place);
        });
        listEl.appendChild(li);
    });
}

// Desenha os marcadores no mapa alinhados perfeitamente
function plotMarkers(places) {
    places.forEach(place => {
        const config = tipoConfig[place.tipo_id] || tipoConfig["geral"];

        new mapboxgl.Marker({ 
            color: config.cor,
            anchor: 'bottom' // Faz a ponta de baixo do pino tocar a coordenada real da rua
        })
        .setLngLat([place.lng, place.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<b>${place.nome}</b><br>Tipo: ${place.tipo_id}`))
        .addTo(map);
    });
}

// Trata a seleção de locais
function onPlaceSelect(place) {
    const destination = [place.lng, place.lat];
    map.flyTo({ center: destination, zoom: 15 });

    if (userLocation) {
        getRoute(userLocation, destination);
    } else {
        document.getElementById('route-info').style.display = 'block';
        document.getElementById('route-details').innerHTML = `Destino: <b>${place.nome}</b>.<br><span style="color: #ffaa00;">Ative o GPS para ver a rota.</span>`;
    }
}

// Faz a chamada à API do Mapbox Directions e desenha o trajeto estável
async function getRoute(start, end) {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}&language=pt`;
    
    try {
        const response = await fetch(url);
        const json = await response.json();
        
        if (!json.routes || json.routes.length === 0) return;
        
        const data = json.routes[0];
        const routeGeoJson = data.geometry;

        if (map.getSource('route')) {
            map.getSource('route').setData({ type: 'Feature', properties: {}, geometry: routeGeoJson });
        } else {
            map.addSource('route', { 
                type: 'geojson', 
                data: { type: 'Feature', properties: {}, geometry: routeGeoJson } 
            });
            map.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#00aaee', 'line-width': 5, 'line-opacity': 0.75 }
            });
        }

        document.getElementById('route-info').style.display = 'block';
        document.getElementById('route-details').innerHTML = `
            <b>Distância:</b> ${(data.distance / 1000).toFixed(2)} km <br>
            <b>Tempo Estimado:</b> ${(data.duration / 60).toFixed(0)} min
        `;
        
        const bounds = new mapboxgl.LngLatBounds().extend(start).extend(end);
        map.fitBounds(bounds, { padding: 50 });

    } catch (err) {
        console.error("Erro na rota do Mapbox:", err);
    }
}

window.onload = initMap;
