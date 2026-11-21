
"use strict";

/* =========================================
   1. PROPIEDADES DEL AGUA
========================================= */

const AGUA = {
    rho: 998.2,
    mu: 0.001002,
    cp: 4182,
    rugosidad: 1.5e-6
};


/* =========================================
   2. FUNCIONES AUXILIARES
========================================= */

function obtenerNumero(id) {

    const elemento = document.getElementById(id);

    if (!elemento) {
        throw new Error("No se encontró el campo: " + id);
    }

    const valor = Number(elemento.value);

    if (!Number.isFinite(valor)) {
        throw new Error("El valor introducido no es válido.");
    }

    return valor;
}

function mostrarMensaje(mensaje, error = false) {

    const elemento = document.getElementById(
        "mensaje-simulacion"
    );

    elemento.textContent = mensaje;

    elemento.style.color = error
        ? "#ff7777"
        : "#28c987";
}


/* =========================================
   3. CALCULAR AREA
========================================= */

function calcularArea(D) {

    return Math.PI * Math.pow(D, 2) / 4;
}


/* =========================================
   4. CALCULAR VELOCIDAD
========================================= */

function calcularVelocidad(Q, A) {

    return Q / A;
}


/* =========================================
   5. CALCULAR REYNOLDS
========================================= */

function calcularReynolds(rho, v, D, mu) {

    return (rho * v * D) / mu;
}


/* =========================================
   6. FACTOR DE FRICCION
========================================= */

function calcularFactorFriccion(Re, rugosidad, D) {

    if (Re <= 0) {
        throw new Error("Reynolds debe ser positivo.");
    }

    if (Re < 2300) {

        return 64 / Re;

    }

    const termino =
        rugosidad / (3.7 * D) +
        5.74 / Math.pow(Re, 0.9);

    return 0.25 / Math.pow(
        Math.log10(termino),
        2
    );
}


/* =========================================
   7. PERDIDA DE PRESION
========================================= */

function calcularPerdidaPresion(
    f,
    L,
    D,
    rho,
    v
) {

    return (
        f *
        (L / D) *
        (rho * Math.pow(v, 2) / 2)
    );
}
// CALCULAR PERDIDA DE PRESION POR OBSTRUCCION - H4
function calcularPerdidaObstruccion(
    porcentajeObstruccion,
    rho,
    velocidad
) {

    const fraccionObstruida =
        porcentajeObstruccion / 100;

    const areaRelativa =
        1 - fraccionObstruida;

    const factorObstruccion =
        Math.pow(
            (1 / areaRelativa) - 1,
            2
        );

    return factorObstruccion *
        (rho * Math.pow(velocidad, 2) / 2);
}

/* =========================================
   8. MODELO HIDRAULICO
========================================= */

function modeloHidraulico(parametros) {

    const {
        L,
        D,
        Q,
        Pin,
        fugaActiva,
        porcentajeFuga,
        posicionFuga
    } = parametros;

    // Caudal perdido en el punto de fuga
    const caudalFuga = fugaActiva
        ? Q * (porcentajeFuga / 100)
        : 0;

    // Caudal que continua despues de la fuga
    const caudalSalida = Q - caudalFuga;

    // Longitudes de los dos tramos
    const longitudAntesFuga = fugaActiva
        ? L * posicionFuga / 100
        : L;

    const longitudDespuesFuga = L - longitudAntesFuga;

    // Area transversal
    const A = calcularArea(D);

    // Velocidades de cada tramo
    const velocidadEntrada = calcularVelocidad(Q, A);
    const velocidadSalida = calcularVelocidad(caudalSalida, A);

    // Reynolds de cada tramo
    const reynoldsEntrada = calcularReynolds(
        AGUA.rho,
        velocidadEntrada,
        D,
        AGUA.mu
    );

    const reynoldsSalida = calcularReynolds(
        AGUA.rho,
        velocidadSalida,
        D,
        AGUA.mu
    );

    // Factores de friccion
    const factorEntrada = calcularFactorFriccion(
        reynoldsEntrada,
        AGUA.rugosidad,
        D
    );

    const factorSalida = calcularFactorFriccion(
        reynoldsSalida,
        AGUA.rugosidad,
        D
    );

    // Perdidas de presion antes y despues de la fuga
    const perdidaAntesFuga = calcularPerdidaPresion(
        factorEntrada,
        longitudAntesFuga,
        D,
        AGUA.rho,
        velocidadEntrada
    );

    const perdidaDespuesFuga = fugaActiva
        ? calcularPerdidaPresion(
            factorSalida,
            longitudDespuesFuga,
            D,
            AGUA.rho,
            velocidadSalida
        )
        : 0;

    // Perdida total de presion
    const perdida = perdidaAntesFuga + perdidaDespuesFuga;

    const Pout = Pin - perdida;

    if (Pout <= 0) {
        throw new Error(
            "La presion de salida es negativa o nula. Revisa los parametros."
        );
    }

    // Presion en el punto de fuga
    const presionFuga = Pin - perdidaAntesFuga;

    // Valores promedio para los indicadores generales
    const caudalPromedio = (Q + caudalSalida) / 2;
    const velocidad = calcularVelocidad(caudalPromedio, A);

    const reynolds = calcularReynolds(
        AGUA.rho,
        velocidad,
        D,
        AGUA.mu
    );

    const factor = calcularFactorFriccion(
        reynolds,
        AGUA.rugosidad,
        D
    );

    // Regimen de flujo representativo
    let regimen;

    if (reynolds < 2300) {
        regimen = "Laminar";
    } else if (reynolds <= 4000) {
        regimen = "Transicion";
    } else {
        regimen = "Turbulento";
    }

    return {
        area: A,
        velocidad: velocidad,
        reynolds: reynolds,
        factor: factor,
        perdida: perdida,
        presionSalida: Pout,
        regimen: regimen,

        caudalEntrada: Q,
        caudalFuga: caudalFuga,
        caudalSalida: caudalSalida,
        caudalPromedio: caudalPromedio,
        porcentajeFuga: porcentajeFuga || 0,

        longitudAntesFuga: longitudAntesFuga,
        longitudDespuesFuga: longitudDespuesFuga,
        posicionFuga: fugaActiva ? posicionFuga : 0,

        velocidadEntrada: velocidadEntrada,
        velocidadSalida: velocidadSalida,
        reynoldsEntrada: reynoldsEntrada,
        reynoldsSalida: reynoldsSalida,

        perdidaAntesFuga: perdidaAntesFuga,
        perdidaDespuesFuga: perdidaDespuesFuga,
        presionFuga: presionFuga
    };
}
// GENERAR MEDICIONES SIMULADAS DE PRESION
function generarMedicionesPresion(parametros, hidraulica) {

    const grupo = document.getElementById("sensores-tuberia");

    if (!grupo) return [];

    const sensores = Array.from(
        grupo.querySelectorAll("g[id^='sensor-']")
    );

    const mediciones = [];

    const D = parametros.D;
    const A = calcularArea(D);

    // Velocidades de cada tramo
    const velocidadEntrada = calcularVelocidad(
        parametros.Q,
        A
    );

    const velocidadSalida = calcularVelocidad(
        hidraulica.caudalSalida,
        A
    );

    // Reynolds de cada tramo
    const reynoldsEntrada = calcularReynolds(
        AGUA.rho,
        velocidadEntrada,
        D,
        AGUA.mu
    );

    const reynoldsSalida = calcularReynolds(
        AGUA.rho,
        velocidadSalida,
        D,
        AGUA.mu
    );

    // Factores de fricción de cada tramo
    const factorEntrada = calcularFactorFriccion(
        reynoldsEntrada,
        AGUA.rugosidad,
        D
    );

    const factorSalida = calcularFactorFriccion(
        reynoldsSalida,
        AGUA.rugosidad,
        D
    );

    sensores.forEach(sensor => {

        const distancia = Number(
            sensor.getAttribute("data-distancia")
        );

        let presion;

        if (
            distancia <= hidraulica.longitudAntesFuga
        ) {

            const perdidaLocal = calcularPerdidaPresion(
                factorEntrada,
                distancia,
                D,
                AGUA.rho,
                velocidadEntrada
            );

            presion = parametros.Pin - perdidaLocal;

        } else {

            const perdidaAntes = hidraulica.perdidaAntesFuga;

            const distanciaDespues =
                distancia - hidraulica.longitudAntesFuga;

            const perdidaDespues = calcularPerdidaPresion(
                factorSalida,
                distanciaDespues,
                D,
                AGUA.rho,
                velocidadSalida
            );

            presion =
                parametros.Pin -
                perdidaAntes -
                perdidaDespues;
        }

        mediciones.push({
            distancia: distancia,
            presion: presion
        });

    });

    return mediciones;
}

 // ESTIMAR UBICACION DE FUGA MEDIANTE PRESION

// ESTIMAR UBICACION DE FUGA MEDIANTE INTERPOLACION

function estimarFugaHidraulica(mediciones) {

    if (!mediciones || mediciones.length < 3) {
        return {
            detectada: false,
            posicion: null,
            variacion: 0
        };
    }

    const datos = [...mediciones].sort(
        (a, b) => a.distancia - b.distancia
    );

    const pendientes = [];

    for (let i = 0; i < datos.length - 1; i++) {

        const distancia =
            datos[i + 1].distancia - datos[i].distancia;

        if (distancia <= 0) continue;

        const pendiente = Math.abs(
            (datos[i + 1].presion - datos[i].presion) / distancia
        );

        pendientes.push({
            pendiente,
            inicio: datos[i].distancia,
            fin: datos[i + 1].distancia
        });
    }

    // Caso de 3 sensores: localización aproximada
    if (datos.length === 3) {

        const pendienteAntes = pendientes[0].pendiente;
        const pendienteDespues = pendientes[1].pendiente;

        const referencia = Math.max(
            pendienteAntes,
            pendienteDespues
        );

        if (referencia === 0) {
            return {
                detectada: false,
                posicion: null,
                variacion: 0
            };
        }

        const variacion = Math.abs(
            pendienteAntes - pendienteDespues
        ) / referencia;

        const detectada = variacion >= 0.15;

        return {
            detectada,
            posicion: detectada ? datos[1].distancia : null,
            variacion
        };
    }

    // Caso de 5 y 8 sensores
    if (pendientes.length < 3) {
        return {
            detectada: false,
            posicion: null,
            variacion: 0
        };
    }

    let mayorVariacion = 0;
    let posicionEstimada = null;

    for (let i = 1; i < pendientes.length - 1; i++) {

        const pendienteAntes = pendientes[i - 1].pendiente;
        const pendienteTransicion = pendientes[i].pendiente;
        const pendienteDespues = pendientes[i + 1].pendiente;

        const referencia = Math.max(
            pendienteAntes,
            pendienteDespues
        );

        if (referencia === 0) continue;

        const variacion = Math.abs(
            pendienteAntes - pendienteDespues
        ) / referencia;

        const diferencia = pendienteAntes - pendienteDespues;

        if (Math.abs(diferencia) < 1e-12) continue;

        const fraccion =
            (pendienteTransicion - pendienteDespues) / diferencia;

        if (fraccion < 0 || fraccion > 1) continue;

        const posicion =
            pendientes[i].inicio +
            fraccion * (pendientes[i].fin - pendientes[i].inicio);

        if (variacion > mayorVariacion) {
            mayorVariacion = variacion;
            posicionEstimada = posicion;
        }
    }

    const detectada =
        mayorVariacion >= 0.15 &&
        posicionEstimada !== null;

    return {
        detectada,
        posicion: detectada ? posicionEstimada : null,
        variacion: mayorVariacion
    };
}


/* =========================================
   9. MODELO TERMICO
========================================= */

function calcularTemperatura(
    x,
    Tin,
    Tamb,
    D,
    U,
    mdot,
    cp
) {

    const exponente =
        (U * Math.PI * D * x) /
        (mdot * cp);

    return (
        Tamb +
        (Tin - Tamb) * Math.exp(-exponente)
    );
}
function modeloTermico(parametros, hidraulica) {

    const { L, D, Tin, Tamb, U } = parametros;

    const caudalMasicoEntrada =
        AGUA.rho * hidraulica.caudalEntrada;

    const caudalMasicoSalida =
        AGUA.rho * hidraulica.caudalSalida;

    const fugaActiva = hidraulica.caudalFuga > 0;

    const distanciaFuga = fugaActiva
        ? L * (hidraulica.posicionFuga / 100)
        : L;

    const puntos = [];
    const numeroPuntos = 101;

    const temperaturaEnFuga = calcularTemperatura(
        distanciaFuga,
        Tin,
        Tamb,
        D,
        U,
        caudalMasicoEntrada,
        AGUA.cp
    );

    for (let i = 0; i < numeroPuntos; i++) {

        const x = (L * i) / (numeroPuntos - 1);

        let temperatura;

        if (fugaActiva && x > distanciaFuga) {

            temperatura = calcularTemperatura(
                x - distanciaFuga,
                temperaturaEnFuga,
                Tamb,
                D,
                U,
                caudalMasicoSalida,
                AGUA.cp
            );

        } else {

            temperatura = calcularTemperatura(
                x,
                Tin,
                Tamb,
                D,
                U,
                caudalMasicoEntrada,
                AGUA.cp
            );

        }

        puntos.push({
            distancia: x,
            temperatura: temperatura
        });
    }

    return {
        temperaturaSalida: puntos[puntos.length - 1].temperatura,
        caudalMasico: AGUA.rho * hidraulica.caudalPromedio,
        caudalMasicoEntrada: caudalMasicoEntrada,
        caudalMasicoSalida: caudalMasicoSalida,
        temperaturaEnFuga: temperaturaEnFuga,
        distanciaFuga: fugaActiva ? distanciaFuga : null,
        perfil: puntos
    };
}
/* =========================================
   10. LEER PARAMETROS DE LA PAGINA
========================================= */


function leerParametros() {

    const controlFuga = document.getElementById("fuga-activa");
    const fugaActiva = controlFuga ? controlFuga.checked : false;

    const porcentajeFuga = fugaActiva
        ? obtenerNumero("porcentaje-fuga")
        : 0;
const posicionFuga = fugaActiva
    ? obtenerNumero("posicion-fuga")
    : 0;
    const p = {

        L: obtenerNumero("longitud"),
        D: obtenerNumero("diametro"),
        Q: obtenerNumero("caudal-entrada"),
        Pin: obtenerNumero("presion-entrada"),
        Tin: obtenerNumero("temperatura-entrada"),
        Tamb: obtenerNumero("temperatura-ambiente"),
        U: obtenerNumero("coeficiente-u"),
       fugaActiva: fugaActiva,
porcentajeFuga: porcentajeFuga,
posicionFuga: posicionFuga

    };

    if (
        p.L <= 0 ||
        p.D <= 0 ||
        p.Q <= 0 ||
        p.Pin <= 0 ||
        p.U < 0 ||
        p.Tin < 0 ||
        p.Tamb < 0
    ) {
        throw new Error(
            "Los parámetros deben tener valores físicos válidos."
        );
    }

    if (p.D > 1) {
        throw new Error(
            "El diámetro debe expresarse en metros."
        );
    }

    if (
        p.fugaActiva &&
        (p.porcentajeFuga < 1 || p.porcentajeFuga > 50)
    ) {
        throw new Error(
            "El porcentaje de fuga debe estar entre 1 y 50."
        );
    }
if (
    p.fugaActiva &&
    (p.posicionFuga < 1 || p.posicionFuga > 99)
) {
    throw new Error(
        "La posición de la fuga debe estar entre 1 y 99."
    );
}
    return p;
}

/* =========================================
   11. MOSTRAR RESULTADOS
========================================= */

function mostrarResultados(hidraulica, termica) {
    document.getElementById(
        "presion-salida"
    ).textContent =
        (hidraulica.presionSalida / 1000).toFixed(2);
    document.getElementById(
        "caudal"
    ).textContent =
        obtenerNumero("caudal-entrada").toExponential(3);
    document.getElementById(
        "temperatura-salida"
    ).textContent =
        termica.temperaturaSalida.toFixed(2);
    document.getElementById(
        "velocidad"
    ).textContent =
        hidraulica.velocidad.toFixed(4);
    const resultados = document.getElementById(
        "estado-resultados"
    );
    resultados.innerHTML = `
        <strong>Resultados calculados:</strong>
        <br><br>
        Reynolds: ${hidraulica.reynolds.toFixed(2)}
        <br>
        Velocidad: ${hidraulica.velocidad.toFixed(4)} m/s
        <br>
        Régimen: ${hidraulica.regimen}
        <br>
        Factor de fricción: ${hidraulica.factor.toFixed(6)}
        <br>
        Pérdida de presión: ${hidraulica.perdida.toFixed(2)} Pa
        <br>
        Caudal másico: ${termica.caudalMasico.toFixed(4)} kg/s
        <br>
        Temperatura de salida: ${termica.temperaturaSalida.toFixed(4)} °C
        <br><br>
<strong>ANÁLISIS DE FUGA:</strong>
<br>
Estado de fuga: ${hidraulica.caudalFuga > 0 ? "Fuga activa" : "Sin fuga"}
<br>
Porcentaje de fuga: ${hidraulica.porcentajeFuga} %
<br>
Caudal de entrada: ${hidraulica.caudalEntrada.toExponential(3)} m³/s
<br>
Caudal perdido: ${hidraulica.caudalFuga.toExponential(3)} m³/s
<br>
Caudal de salida: ${hidraulica.caudalSalida.toExponential(3)} m³/s
<br>
Posición de la fuga:
${hidraulica.caudalFuga > 0
    ? hidraulica.posicionFuga + " % (" +
      hidraulica.longitudAntesFuga.toFixed(2) + " m desde la entrada)"
    : "No aplica"}
<br>
Longitud antes de la fuga:
${hidraulica.longitudAntesFuga.toFixed(2)} m
<br>
Longitud después de la fuga:
${hidraulica.longitudDespuesFuga.toFixed(2)} m
<br>
Presión en el punto de fuga:
${(hidraulica.presionFuga / 1000).toFixed(2)} kPa
<br>
Temperatura en el punto de fuga:
${hidraulica.caudalFuga > 0
    ? termica.temperaturaEnFuga.toFixed(2) + " °C"
    : "No aplica"}
<br>
Pérdida de presión antes de la fuga:
${hidraulica.perdidaAntesFuga.toFixed(2)} Pa
<br>
Pérdida de presión después de la fuga:
${hidraulica.perdidaDespuesFuga.toFixed(2)} Pa
    `;
    // ACTUALIZAR VISUALIZACION 2D DE LA TUBERIA
    const longitudTuberia = obtenerNumero("longitud");
    const diametroTuberia = obtenerNumero("diametro");
    const presionEntradaTuberia = obtenerNumero("presion-entrada");
    const temperaturaEntradaTuberia = obtenerNumero("temperatura-entrada");
    const presionSalidaTuberia =
        presionEntradaTuberia - hidraulica.perdida;
    // Entrada
    document.getElementById("tuberia-pin").textContent =
        (presionEntradaTuberia / 1000).toFixed(2) + " kPa";
    document.getElementById("tuberia-tin").textContent =
        temperaturaEntradaTuberia.toFixed(2) + " °C";
    // Salida
    document.getElementById("tuberia-pout").textContent =
        (presionSalidaTuberia / 1000).toFixed(2) + " kPa";

    document.getElementById("tuberia-tout").textContent =
        termica.temperaturaSalida.toFixed(2) + " °C";
    // Dimensiones
    document.getElementById("tuberia-longitud").textContent =
        longitudTuberia + " m";
    document.getElementById("tuberia-diametro").textContent =
        diametroTuberia + " m";
    // Indicadores hidráulicos
    document.getElementById("tuberia-velocidad").textContent =
        hidraulica.velocidad.toFixed(4) + " m/s";
    document.getElementById("tuberia-caudal").textContent =
        obtenerNumero("caudal-entrada").toFixed(4) + " m³/s";
    document.getElementById("tuberia-reynolds").textContent =
        hidraulica.reynolds.toFixed(2);
    document.getElementById("tuberia-regimen").textContent =
        hidraulica.regimen;
    dibujarPerfilTermico(termica.perfil);
   actualizarTemperaturasSensores(termica.perfil);
   // ESTIMAR AUTOMATICAMENTE LA UBICACION DE LA FUGA
estimarUbicacionFuga();
   
    // GENERAR Y ANALIZAR MEDICIONES DE PRESION
    const parametrosPresion = {
        D: obtenerNumero("diametro"),
        Q: obtenerNumero("caudal-entrada"),
        Pin: obtenerNumero("presion-entrada")
    };

    const medicionesPresion = generarMedicionesPresion(
        parametrosPresion,
        hidraulica
    );

    const estimacionHidraulica = estimarFugaHidraulica(
        medicionesPresion
    );

    // MOSTRAR RESULTADO DEL ESTIMADOR HIDRAULICO
    const estadoHidraulico = document.getElementById(
        "estado-localizacion"
    );

    if (estadoHidraulico) {

        if (estimacionHidraulica.detectada) {

            estadoHidraulico.textContent =
                "Se detectó una anomalía en el perfil de presión.";

            const posicion = estimacionHidraulica.posicion;

            document.getElementById("posicion-estimada").textContent =
                posicion.toFixed(2) + " m";

            const sensoresOrdenados = [...medicionesPresion].sort(
                (a, b) => a.distancia - b.distancia
            );

            let indiceCercano = 0;
            let menorDistancia = Infinity;

            sensoresOrdenados.forEach((sensor, i) => {

                const diferencia = Math.abs(
                    sensor.distancia - posicion
                );

                if (diferencia < menorDistancia) {
                    menorDistancia = diferencia;
                    indiceCercano = i;
                }

            });

            document.getElementById("tramo-estimado").textContent =
                "Cercano al sensor " + (indiceCercano + 1);

            if (hidraulica.caudalFuga > 0) {

                const posicionReal =
                    hidraulica.longitudAntesFuga;

                const error = Math.abs(
                    posicion - posicionReal
                );

                document.getElementById("error-localizacion").textContent =
                    error.toFixed(2) + " m";

            } else {

                document.getElementById("error-localizacion").textContent =
                    "No aplica";

            }

        } else {

            estadoHidraulico.textContent =
                "No se detectó un cambio significativo en el perfil de presión.";

            document.getElementById("posicion-estimada").textContent =
                "-- m";

            document.getElementById("tramo-estimado").textContent =
                "--";

            document.getElementById("error-localizacion").textContent =
                "-- m";
        }
    }

   // ACTUALIZAR VISUALIZACION DE FUGA

const fugaVisual = document.getElementById("fuga-visualizacion");

if (fugaVisual) {

    const fugaActiva = hidraulica.caudalFuga > 0;

    fugaVisual.style.display = fugaActiva ? "inline" : "none";

    if (fugaActiva) {

        const posicionX = 42 + (
            816 * hidraulica.posicionFuga / 100
        );

        fugaVisual.setAttribute(
            "transform",
            "translate(" + (posicionX - 516) + ", 0)"
        );

    }
}
}
/* =========================================
   12. GRAFICO DEL PERFIL TERMICO
========================================= */

function dibujarPerfilTermico(datos) {

    const contenedor = document.getElementById(
        "grafico-principal"
    );

    const ancho = 700;
    const alto = 300;

    const margen = {
        izquierda: 65,
        derecha: 25,
        arriba: 25,
        abajo: 45
    };

    const anchoUtil =
        ancho - margen.izquierda - margen.derecha;

    const altoUtil =
        alto - margen.arriba - margen.abajo;

    const Tmin = Math.min(
        ...datos.map(p => p.temperatura)
    );

    const Tmax = Math.max(
        ...datos.map(p => p.temperatura)
    );

    const rangoT = Math.max(Tmax - Tmin, 0.1);

    const maxX = datos[datos.length - 1].distancia;

    const puntosSVG = datos.map(p => {

        const x =
            margen.izquierda +
            (p.distancia / maxX) * anchoUtil;

        const y =
            margen.arriba +
            ((Tmax - p.temperatura) / rangoT) * altoUtil;

        return `${x},${y}`;

    }).join(" ");

    contenedor.innerHTML = `
        <svg
            viewBox="0 0 ${ancho} ${alto}"
            width="100%"
            role="img"
            aria-label="Perfil de temperatura a lo largo de la tubería">

            <line
                x1="${margen.izquierda}"
                y1="${margen.arriba}"
                x2="${margen.izquierda}"
                y2="${alto - margen.abajo}"
                stroke="#a7b8cc"
                stroke-width="2"/>

            <line
                x1="${margen.izquierda}"
                y1="${alto - margen.abajo}"
                x2="${ancho - margen.derecha}"
                y2="${alto - margen.abajo}"
                stroke="#a7b8cc"
                stroke-width="2"/>

            <polyline
                points="${puntosSVG}"
                fill="none"
                stroke="#52b7ff"
                stroke-width="3"
                stroke-linejoin="round"/>

            <text
                x="${ancho / 2}"
                y="${alto - 8}"
                fill="#edf4fc"
                text-anchor="middle"
                font-size="13">
                Distancia (m)
            </text>

            <text
                x="17"
                y="${alto / 2}"
                fill="#edf4fc"
                text-anchor="middle"
                font-size="13"
                transform="rotate(-90 17 ${alto / 2})">
                Temperatura (°C)
            </text>

            <text
                x="${margen.izquierda}"
                y="17"
                fill="#edf4fc"
                font-size="12">
                ${Tmax.toFixed(2)} °C
            </text>

            <text
                x="${margen.izquierda}"
                y="${alto - margen.abajo - 8}"
                fill="#edf4fc"
                font-size="12">
                ${Tmin.toFixed(2)} °C
            </text>

        </svg>
    `;
}

// Actualizar las temperaturas y posiciones de los sensores.
// ESTIMACION AUTOMATICA DE LA UBICACION DE UNA FUGA
function estimarUbicacionFuga() {
    const grupo = document.getElementById("sensores-tuberia");

    const estado = document.getElementById("estado-localizacion");
    const posicion = document.getElementById("posicion-estimada");
    const tramo = document.getElementById("tramo-estimado");
    const error = document.getElementById("error-localizacion");

    if (!grupo || !estado || !posicion || !tramo || !error) {
        return;
    }

    const sensores = Array.from(
        grupo.querySelectorAll("g[id^='sensor-']")
    );

    const mediciones = sensores.map(sensor => {

        const distancia = Number(
            sensor.getAttribute("data-distancia")
        );

        const etiqueta = sensor.querySelector(".temperatura-sensor");

        return {
            distancia: distancia,
            temperatura: etiqueta
                ? parseFloat(etiqueta.textContent)
                : NaN
        };

    }).filter(sensor =>
        Number.isFinite(sensor.distancia) &&
        Number.isFinite(sensor.temperatura)
    );

    if (mediciones.length < 3) {

        estado.textContent =
            "Se necesitan al menos 3 sensores para estimar una ubicación.";

        posicion.textContent = "-- m";
        tramo.textContent = "--";
        error.textContent = "-- m";

        return;
    }

    mediciones.sort(
        (a, b) => a.distancia - b.distancia
    );

    let mayorVariacion = 0;
    let indiceTramo = -1;

    for (let i = 0; i < mediciones.length - 1; i++) {

        const variacion = Math.abs(
            mediciones[i + 1].temperatura -
            mediciones[i].temperatura
        );

        if (variacion > mayorVariacion) {

            mayorVariacion = variacion;
            indiceTramo = i;

        }
    }

    const sensorInicial = mediciones[indiceTramo];
    const sensorFinal = mediciones[indiceTramo + 1];

    const posicionCalculada = (
        sensorInicial.distancia +
        sensorFinal.distancia
    ) / 2;

    estado.textContent =
        mayorVariacion > 0
            ? "Tramo con mayor variación térmica identificado."
            : "No se identificó una variación térmica.";

    posicion.textContent =
        posicionCalculada.toFixed(2) + " m";

    tramo.textContent =
        sensorInicial.distancia.toFixed(2) +
        " m – " +
        sensorFinal.distancia.toFixed(2) +
        " m";

    error.textContent =
        "Pendiente de evaluación";
}
function actualizarTemperaturasSensores(datos) {

    const grupo = document.getElementById("sensores-tuberia");
    const selector = document.getElementById("cantidad-sensores");
    const controlFuga = document.getElementById("fuga-activa");

    if (!grupo || !selector || !datos || datos.length === 0) {
        return;
    }

    const sensores = grupo.querySelectorAll("g[id^='sensor-']");

    // Eliminar etiquetas anteriores.
    grupo.querySelectorAll(
        ".temperatura-sensor, .estado-fuga-sensor"
    ).forEach(etiqueta => etiqueta.remove());

    const longitud = datos[datos.length - 1].distancia;

    const fugaActiva = controlFuga && controlFuga.checked;

    const posicionFuga = fugaActiva
        ? longitud * obtenerNumero("posicion-fuga") / 100
        : null;

    const temperaturas = datos.map(p => p.temperatura);

    const Tmin = Math.min(...temperaturas);
    const Tmax = Math.max(...temperaturas);
    const rango = Tmax - Tmin;

    sensores.forEach((sensor, indice) => {

        // Obtener la posición física guardada en cada sensor.
        const distancia = Number(sensor.getAttribute("data-distancia"));

        let puntoCercano = datos[0];

        datos.forEach(punto => {
            if (
                Math.abs(punto.distancia - distancia) <
                Math.abs(puntoCercano.distancia - distancia)
            ) {
                puntoCercano = punto;
            }
        });

        const temperatura = puntoCercano.temperatura;

        // Cambiar el color según la temperatura.
        const circuloSensor = sensor.querySelector("circle");

        let colorSensor;

        if (rango < 0.1) {
            colorSensor = "#22c55e";
        } else {

            const proporcion = (temperatura - Tmin) / rango;

            if (proporcion <= 0.33) {
                colorSensor = "#38bdf8";
            } else if (proporcion <= 0.66) {
                colorSensor = "#facc15";
            } else {
                colorSensor = "#ef4444";
            }
        }

        circuloSensor.setAttribute("fill", colorSensor);

        // Mostrar temperatura.
        const etiqueta = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );

        etiqueta.classList.add("temperatura-sensor");

        etiqueta.setAttribute(
            "x",
            circuloSensor.getAttribute("cx")
        );

        etiqueta.setAttribute("y", 215);
        etiqueta.setAttribute("text-anchor", "middle");
        etiqueta.setAttribute("fill", "#fbbf24");
        etiqueta.setAttribute("font-size", "12");
        etiqueta.setAttribute("font-weight", "bold");

        etiqueta.textContent = `${temperatura.toFixed(1)} °C`;

        sensor.appendChild(etiqueta);

        // Clasificar la posición respecto a la fuga.
        let estadoSensor = "Sin fuga";

        if (fugaActiva) {

            if (Math.abs(distancia - posicionFuga) < 0.01) {
                estadoSensor = "En fuga";
            } else if (distancia < posicionFuga) {
                estadoSensor = "Antes";
            } else {
                estadoSensor = "Después";
            }
        }

        // Mostrar clasificación debajo de la temperatura.
        const estado = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );

        estado.classList.add("estado-fuga-sensor");

        estado.setAttribute(
            "x",
            circuloSensor.getAttribute("cx")
        );

        estado.setAttribute("y", 247);
        estado.setAttribute("text-anchor", "middle");
        estado.setAttribute("fill", "#e2e8f0");
        estado.setAttribute("font-size", "10");

        estado.textContent = estadoSensor;

        sensor.appendChild(estado);
    }); // Aquí termina sensores.forEach()


    // RESUMEN DE DISTRIBUCION DE SENSORES

    const resumen = document.getElementById("resumen-sensores");

    if (resumen) {

        let sensoresAntes = 0;
        let sensoresDespues = 0;
        let sensoresEnFuga = 0;

        sensores.forEach(sensor => {

            const distancia = Number(
                sensor.getAttribute("data-distancia")
            );

            if (fugaActiva) {

                if (Math.abs(distancia - posicionFuga) < 0.01) {
                    sensoresEnFuga++;
                } else if (distancia < posicionFuga) {
                    sensoresAntes++;
                } else {
                    sensoresDespues++;
                }

            } else {
                sensoresAntes++;
            }
        });

        resumen.innerHTML = `
            <strong>Distribución de sensores</strong>
            <br><br>
            Total de sensores: ${sensores.length}
            <br>
            Sensores antes de la fuga: ${sensoresAntes}
            <br>
            Sensores en el punto de fuga: ${sensoresEnFuga}
            <br>
            Sensores después de la fuga: ${sensoresDespues}
        `;
    }

}

/* =========================================
   13. EJECUTAR SIMULACION
========================================= */

function ejecutarSimulacion() {

    try {

        const parametros = leerParametros();

        const hidraulica = modeloHidraulico(
            parametros
        );

        const termica = modeloTermico(
            parametros, hidraulica
        );

        mostrarResultados(
            hidraulica,
            termica
        );

        mostrarMensaje(
            "Simulación calculada correctamente."
        );

    } catch (error) {

        mostrarMensaje(
            error.message,
            true
        );

    }
}


/* =========================================
   14. SELECCION DE EXPERIMENTOS
========================================= */

function consultarExperimento(codigo) {

    const panel = document.getElementById(
        "detalle-experimento"
    );

    const titulos = {

        H1: "H1 - Ruido de sensores",

        H2: "H2 - Frecuencia de muestreo",

        H3: "H3 - Cantidad de sensores",

        H4: "H4 - Tipos de fallas"

    };

    panel.innerHTML = `
        <h3>${titulos[codigo]}</h3>

        <p>
            El experimento ${codigo} está seleccionado.
        </p>

        <p>
            Los resultados estadísticos se mostrarán
            cuando se conecten los archivos CSV.
        </p>
    `;

}


/* =========================================
   15. ACTIVAR LOS BOTONES
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const botonSimular = document.getElementById(
            "btn-simular"
        );

        botonSimular.addEventListener(
            "click",
            ejecutarSimulacion
        );


        function interpretarCSV(texto) {
            const filas = [];
            let fila = [];
            let campo = "";
            let dentroComillas = false;

            for (let i = 0; i < texto.length; i++) {
                const caracter = texto[i];

                if (caracter === '"') {
                    if (dentroComillas && texto[i + 1] === '"') {
                        campo += '"';
                        i++;
                    } else {
                        dentroComillas = !dentroComillas;
                    }
                } else if (caracter === "," && !dentroComillas) {
                    fila.push(campo);
                    campo = "";
                } else if (
                    (caracter === "\n" || caracter === "\r") &&
                    !dentroComillas
                ) {
                    if (caracter === "\r" && texto[i + 1] === "\n") {
                        i++;
                    }

                    fila.push(campo);

                    if (fila.some(valor => valor.trim() !== "")) {
                        filas.push(fila);
                    }

                    fila = [];
                    campo = "";
                } else {
                    campo += caracter;
                }
            }

            fila.push(campo);

            if (fila.some(valor => valor.trim() !== "")) {
                filas.push(fila);
            }

            if (filas.length < 2) {
                return { encabezados: [], registros: [] };
            }

            const encabezados = filas[0].map(valor => valor.trim());

            const registros = filas.slice(1).map(valores => {
                const registro = {};

                encabezados.forEach((encabezado, indice) => {
                    registro[encabezado] = valores[indice] ?? "";
                });

                return registro;
            });

            return { encabezados, registros };
        }

        async function cargarResultadosExperimento(codigo) {
            const contenedor = document.getElementById("detalle-experimento");

            contenedor.innerHTML = `<p>Cargando resultados de ${codigo}...</p>`;

            try {
                const respuesta = await fetch(
                    `data/resultados_${codigo}.csv`,
                    { cache: "no-store" }
                );

                if (!respuesta.ok) {
                    throw new Error(`Error HTTP ${respuesta.status}`);
                }

                const textoCSV = await respuesta.text();
                const datos = interpretarCSV(textoCSV);

                if (datos.registros.length === 0) {
                    throw new Error("El CSV no contiene registros.");
                }

                contenedor.innerHTML = "";

                const titulo = document.createElement("h3");
                titulo.textContent = `Resultados del experimento ${codigo}`;
                contenedor.appendChild(titulo);

                const cantidad = document.createElement("p");
                cantidad.textContent =
                    `Registros encontrados: ${datos.registros.length}`;
                contenedor.appendChild(cantidad);

                const tabla = document.createElement("table");
                tabla.className = "tabla-datos";

                const encabezado = document.createElement("thead");
                const filaEncabezado = document.createElement("tr");

                datos.encabezados.forEach(nombre => {
                    const th = document.createElement("th");
                    th.textContent = nombre;
                    filaEncabezado.appendChild(th);
                });

                encabezado.appendChild(filaEncabezado);
                tabla.appendChild(encabezado);

                const cuerpo = document.createElement("tbody");

                datos.registros.forEach(registro => {
                    const tr = document.createElement("tr");

                    datos.encabezados.forEach(nombre => {
                        const td = document.createElement("td");
                        td.textContent = registro[nombre] ?? "";
                        tr.appendChild(td);
                    });

                    cuerpo.appendChild(tr);
                });

                tabla.appendChild(cuerpo);
                contenedor.appendChild(tabla);

            } catch (error) {
                contenedor.innerHTML = "";

                const mensaje = document.createElement("p");
                mensaje.textContent =
                    `Error al cargar ${codigo}: ${error.message}`;

                contenedor.appendChild(mensaje);
                console.error(error);
            }
        }

  
document.querySelectorAll("[data-experimento]").forEach(boton => {

    boton.addEventListener("click", () => {

        const codigo = boton.dataset.experimento;

        if (codigo === "H1") {

            mostrarLaboratorioH1();

        } else if (codigo === "H2") {

            mostrarLaboratorioH2();

        } else if (codigo === "H3") {

            mostrarLaboratorioH3();

        } else {

            cargarResultadosExperimento(codigo);

        }

    });

});
function mostrarLaboratorioH1() {

    const contenedor = document.getElementById("detalle-experimento");

    contenedor.innerHTML = `

        <div class="laboratorio-h1">

            <h3>H1 - Influencia del ruido en los sensores</h3>

            <p>
                En este experimento observarás cómo las variaciones
                aleatorias afectan las mediciones de presión de un
                sistema de monitoreo de tuberías.
            </p>

            <div class="panel-h1">

                <h4>1. Configuración del experimento</h4>

                <label for="nivel-ruido-h1">
                    Selecciona el nivel de ruido:
                </label>

                <select id="nivel-ruido-h1">
                    <option value="0">Sin ruido</option>
                    <option value="5">Ruido bajo</option>
                    <option value="12">Ruido medio</option>
                    <option value="22">Ruido alto</option>
                </select>

                <button id="generar-h1">
                    Generar mediciones
                </button>

            </div>

            <div class="panel-h1">

                <h4>2. Comparación de señales</h4>

                <p>
                    La línea azul representa la señal ideal.
                    La línea roja representa la medición afectada
                    por ruido.
                </p>

                <svg id="grafica-h1"
                     viewBox="0 0 800 250"
                     width="100%"
                     role="img"
                     aria-label="Comparación de señal ideal y señal con ruido">

                    <line x1="40" y1="30" x2="40" y2="210"
                          stroke="currentColor"/>

                    <line x1="40" y1="210" x2="770" y2="210"
                          stroke="currentColor"/>

                    <line x1="40" y1="70" x2="770" y2="70"
                          stroke="#999" stroke-dasharray="4 4"/>

                    <line x1="40" y1="110" x2="770" y2="110"
                          stroke="#999" stroke-dasharray="4 4"/>

                    <line x1="40" y1="150" x2="770" y2="150"
                          stroke="#999" stroke-dasharray="4 4"/>

                    <text x="45" y="20" font-size="12" fill="currentColor">
                        Presión (representación)
                    </text>

                    <text x="600" y="240" font-size="12" fill="currentColor">
                        Tiempo →
                    </text>

                    <path id="senal-ideal-h1"
                          fill="none"
                          stroke="#2878d0"
                          stroke-width="3"/>

                    <path id="senal-ruidosa-h1"
                          fill="none"
                          stroke="#dc5555"
                          stroke-width="2"/>

                </svg>

                <p>
                    <span style="color:#2878d0">●</span>
                    Señal ideal
                    &nbsp;&nbsp;
                    <span style="color:#dc5555">●</span>
                    Señal con ruido
                </p>

            </div>

            <div class="panel-h1">
    <h4>3. Interpretación</h4>

    <p id="interpretacion-h1">
        Selecciona un nivel de ruido y genera las mediciones.
    </p>

</div>

<div class="panel-h1">

    <h4>4. Resultado de la detección</h4>

    <p>
        El sistema compara la presión promedio antes y después
        del cambio de señal.
    </p>

    <p>
        Presión promedio antes:
        <strong id="presion-antes-h1">--</strong>
    </p>

    <p>
        Presión promedio después:
        <strong id="presion-despues-h1">--</strong>
    </p>

    <p>
        Diferencia de presión:
        <strong id="diferencia-h1">--</strong>
    </p>

    <p>
        Estado de detección:
        <strong id="deteccion-h1">Pendiente</strong>
    </p>

    <p id="explicacion-deteccion-h1">
        Genera las mediciones para evaluar la anomalía.
    </p>

</div>

</div>
</div>
`;


    const selector = document.getElementById("nivel-ruido-h1");
    const boton = document.getElementById("generar-h1");


function actualizarGraficaH1() {

    const amplitud = Number(selector.value);

    let puntosIdeales = [];
    let puntosRuidosos = [];
    let mediciones = [];

    for (let i = 0; i < 100; i++) {

        const x = 40 + i * 7.3;

        const ideal = i < 50 ? 105 : 65;

        const ruido = (Math.random() - 0.5) * amplitud * 2;

        const medida = ideal + ruido;

        mediciones.push(medida);

        puntosIdeales.push(
            `${i === 0 ? "M" : "L"} ${x} ${ideal}`
        );

        puntosRuidosos.push(
            `${i === 0 ? "M" : "L"} ${x} ${medida}`
        );
    }

    document.getElementById("senal-ideal-h1")
        .setAttribute("d", puntosIdeales.join(" "));

    document.getElementById("senal-ruidosa-h1")
        .setAttribute("d", puntosRuidosos.join(" "));

    // Promedios de presión antes y después del cambio
    const antes = mediciones.slice(35, 45);
    const despues = mediciones.slice(55, 65);

    const promedioAntes =
        antes.reduce((suma, valor) => suma + valor, 0) / antes.length;

    const promedioDespues =
        despues.reduce((suma, valor) => suma + valor, 0) / despues.length;

    const diferencia = promedioAntes - promedioDespues;

    // Detector sencillo por umbral
    const umbral = 35;
    const detectada = diferencia >= umbral;

    document.getElementById("presion-antes-h1").textContent =
        promedioAntes.toFixed(2);

    document.getElementById("presion-despues-h1").textContent =
        promedioDespues.toFixed(2);

    document.getElementById("diferencia-h1").textContent =
        diferencia.toFixed(2);

    document.getElementById("deteccion-h1").textContent =
        detectada ? "Anomalía detectada" : "Anomalía no detectada";

    document.getElementById("explicacion-deteccion-h1").textContent =
        detectada
        ? "La diferencia de presión superó el umbral establecido. El sistema identificó un cambio significativo."
        : "La diferencia de presión no alcanzó el umbral. El sistema no identificó la anomalía.";

    const interpretacion =
        document.getElementById("interpretacion-h1");

    if (amplitud === 0) {

        interpretacion.textContent =
            "Sin ruido, las mediciones siguen la señal ideal. El cambio de presión se observa claramente.";

    } else if (amplitud === 5) {

        interpretacion.textContent =
            "Con ruido bajo aparecen pequeñas variaciones, pero el cambio de presión todavía se distingue.";

    } else if (amplitud === 12) {

        interpretacion.textContent =
            "Con ruido medio las mediciones presentan fluctuaciones más visibles.";

      } else {

        interpretacion.textContent =
            "Con ruido alto las mediciones fluctúan considerablemente y pueden dificultar la detección.";

    }
}

// Eventos del laboratorio H1.
boton.addEventListener("click", actualizarGraficaH1);

selector.addEventListener("change", actualizarGraficaH1);

// Generar la primera gráfica al abrir el laboratorio.
actualizarGraficaH1();

}

function mostrarLaboratorioH2() {

    const contenedor = document.getElementById("detalle-experimento");

    contenedor.innerHTML = `
        <div class="laboratorio-h2">

            <h3>H2 - Influencia de la frecuencia de muestreo</h3>

            <p>
                En este experimento observarás cómo el intervalo
                entre mediciones afecta el tiempo que tarda el
                sistema en detectar una anomalía.
            </p>

            <div class="panel-h1">

                <h4>1. Configuración del experimento</h4>

                <label for="intervalo-h2">
                    Intervalo de muestreo:
                </label>

                <select id="intervalo-h2">
                    <option value="1">1 segundo</option>
                    <option value="2">2 segundos</option>
                    <option value="5">5 segundos</option>
                    <option value="10">10 segundos</option>
                    <option value="20">20 segundos</option>
                </select>

                <button id="generar-h2">
                    Generar mediciones
                </button>

            </div>

            <div class="panel-h1">

                <h4>2. Señal y mediciones del sensor</h4>

                <p>
                    La línea azul representa la señal continua.
                    Los puntos rojos representan las mediciones
                    tomadas por el sensor.
                </p>

                <svg id="grafica-h2"
                     viewBox="0 0 800 270"
                     width="100%"
                     role="img"
                     aria-label="Señal continua y muestras del sensor">

                    <line x1="50" y1="30" x2="50" y2="220"
                          stroke="currentColor"/>

                    <line x1="50" y1="220" x2="750" y2="220"
                          stroke="currentColor"/>
<!-- Referencias del eje de tiempo -->
<g stroke="#999" stroke-dasharray="3 4" opacity="0.5">

    <line x1="166.7" y1="30" x2="166.7" y2="220"/>
    <line x1="283.3" y1="30" x2="283.3" y2="220"/>
    <line x1="400" y1="30" x2="400" y2="220"/>
    <line x1="516.7" y1="30" x2="516.7" y2="220"/>
    <line x1="633.3" y1="30" x2="633.3" y2="220"/>

</g>

<g fill="currentColor" font-size="11" text-anchor="middle">

    <text x="50" y="238">0</text>
    <text x="166.7" y="238">5</text>
    <text x="283.3" y="238">10</text>
    <text x="400" y="238">15</text>
    <text x="516.7" y="238">20</text>
    <text x="633.3" y="238">25</text>
    <text x="750" y="238">30</text>

</g>
                    <path id="senal-ideal-h2"
                          fill="none"
                          stroke="#2878d0"
                          stroke-width="3"/>
<!-- Instante real de aparición de la anomalía: 11 segundos -->
<line x1="306.7" y1="30"
      x2="306.7" y2="220"
      stroke="#f59e0b"
      stroke-width="2"
      stroke-dasharray="6 4"/>

<text x="315" y="45"
      fill="#f59e0b"
      font-size="12">
    Anomalía (11 s)
</text>
                    <g id="puntos-h2"></g>

                    <text x="55" y="20" fill="currentColor">
                        Presión (representación)
                    </text>

                    <text x="690" y="250" fill="currentColor">
                        Tiempo (s)
                    </text>

                </svg>

                <p>
                    <span style="color:#2878d0">●</span>
                    Señal continua
                    &nbsp;&nbsp;
                    <span style="color:#dc5555">●</span>
                    Mediciones del sensor
                </p>

            </div>

            <div class="panel-h1">

                <h4>3. Resultado de la detección</h4>

                <p>
                    Intervalo seleccionado:
                    <strong id="intervalo-resultado-h2">--</strong>
                </p>

                <p>
                    Cantidad de mediciones:
                    <strong id="cantidad-muestras-h2">--</strong>
                </p>

                <p>
                    Tiempo de detección:
                    <strong id="tiempo-deteccion-h2">--</strong>
                </p>

                <p>
                    Retardo de detección:
                    <strong id="retardo-h2">--</strong>
                </p>

            </div>

            <div class="panel-h1">

                <h4>4. Interpretación</h4>

                <p id="interpretacion-h2">
                    Selecciona un intervalo de muestreo.
                </p>

            </div>

        </div>
    `;

    const selector = document.getElementById("intervalo-h2");
    const boton = document.getElementById("generar-h2");

    function actualizarGraficaH2() {

        const intervalo = Number(selector.value);

        const inicio = 0;
        const fin = 30;
        const instanteAnomalia = 11;

        const x = tiempo => 50 + tiempo * (700 / 30);
        const y = presion => presion === 100 ? 170 : 80;

        const trayectoria =
            "M " + x(0) + " " + y(100) +
            " L " + x(instanteAnomalia) + " " + y(100) +
            " L " + x(instanteAnomalia) + " " + y(70) +
            " L " + x(fin) + " " + y(70);

        document.getElementById("senal-ideal-h2")
            .setAttribute("d", trayectoria);

        const grupo = document.getElementById("puntos-h2");
        grupo.innerHTML = "";

        let muestras = [];
        let tiempoDeteccion = null;

        for (let t = inicio; t <= fin; t += intervalo) {

            const presion = t < instanteAnomalia ? 100 : 70;

            muestras.push(t);

            if (tiempoDeteccion === null && t >= instanteAnomalia) {
                tiempoDeteccion = t;
            }

            const punto = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );

            punto.setAttribute("cx", x(t));
            punto.setAttribute("cy", y(presion));
            punto.setAttribute("r", "6");
            punto.setAttribute("fill", "#dc5555");

            grupo.appendChild(punto);
        }

        const retardo = tiempoDeteccion - instanteAnomalia;

        document.getElementById("intervalo-resultado-h2").textContent =
            intervalo + " segundos";

        document.getElementById("cantidad-muestras-h2").textContent =
            muestras.length;

        document.getElementById("tiempo-deteccion-h2").textContent =
            tiempoDeteccion + " segundos";

        document.getElementById("retardo-h2").textContent =
            retardo + " segundos";

        const interpretacion = document.getElementById("interpretacion-h2");

        if (intervalo <= 2) {

            interpretacion.textContent =
                "El sensor toma mediciones frecuentes. Esto permite detectar la anomalía con poco retardo.";

        } else if (intervalo <= 5) {

            interpretacion.textContent =
                "El sensor realiza menos mediciones. El retardo de detección aumenta.";

        } else {

            interpretacion.textContent =
                "El intervalo de muestreo es amplio. El sensor puede tardar más en registrar la anomalía.";

        }
    }

    boton.addEventListener("click", actualizarGraficaH2);

    selector.addEventListener("change", actualizarGraficaH2);

    actualizarGraficaH2();
}

function mostrarLaboratorioH3() {

    const contenedor = document.getElementById("detalle-experimento");

    contenedor.innerHTML = `
        <div class="laboratorio-h3">

            <h3>H3 - Influencia de la cantidad de sensores</h3>

            <p>
                En este experimento observarás cómo la cantidad
                de sensores distribuidos a lo largo de una tubería
                influye en la localización de una fuga.
            </p>

            <div class="panel-h1">

                <h4>1. Configuración de sensores</h4>

                <p>
                    Cantidad de sensores instalada:
                    <strong id="cantidad-h3">--</strong>
                </p>

                <p>
                    Modifica la cantidad de sensores en la
                    configuración principal de la simulación.
                </p>

            </div>

            <div class="panel-h1">

                <h4>2. Distribución de los sensores</h4>

                <svg id="grafica-h3"
                     viewBox="0 0 800 160"
                     width="100%"
                     role="img"
                     aria-label="Distribución de sensores en una tubería">

                    <rect x="40" y="65" width="720" height="35"
                          rx="8" fill="#64748b"/>

                    <g id="sensores-visuales-h3"></g>

                </svg>

                <p>
                    Los sensores se distribuyen a lo largo
                    de la tubería para obtener información
                    de diferentes posiciones.
                </p>

            </div>

            <div class="panel-h1">

                <h4>3. Ejecutar el análisis</h4>

                <p>
                    Activa una fuga en la simulación principal
                    y configura su posición antes de ejecutar
                    el análisis.
                </p>

                <button id="analizar-h3">
                    Calcular localización
                </button>

                <p id="mensaje-h3">
                    Esperando el cálculo de la simulación.
                </p>

            </div>

            <div class="panel-h1">

                <h4>4. Resultados de localización</h4>

                <p>
                    Estado:
                    <strong id="estado-h3">Pendiente</strong>
                </p>

                <p>
                    Posición estimada:
                    <strong id="posicion-h3">--</strong>
                </p>

                <p>
                    Tramo identificado:
                    <strong id="tramo-h3">--</strong>
                </p>

                <p>
                    Error de localización:
                    <strong id="error-h3">--</strong>
                </p>

            </div>

            <div class="panel-h1">

                <h4>5. Interpretación</h4>

                <p id="interpretacion-h3">
                    Ejecuta el análisis para observar
                    cómo se comporta el sistema.
                </p>

            </div>

        </div>
    `;

    const selector = document.getElementById("cantidad-sensores");
    const boton = document.getElementById("analizar-h3");

    function actualizarDistribucionH3() {

        const cantidad = Number(selector.value);

        document.getElementById("cantidad-h3").textContent =
            cantidad + (cantidad === 1 ? " sensor" : " sensores");

        const grupo = document.getElementById("sensores-visuales-h3");

        grupo.innerHTML = "";

        for (let i = 0; i < cantidad; i++) {

            const x = 40 + 720 * (i + 1) / (cantidad + 1);

            const circulo = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );

            circulo.setAttribute("cx", x);
            circulo.setAttribute("cy", 82);
            circulo.setAttribute("r", 10);
            circulo.setAttribute("fill", "#f59e0b");
            circulo.setAttribute("stroke", "#ffffff");
            circulo.setAttribute("stroke-width", 2);

            grupo.appendChild(circulo);

            const etiqueta = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );

            etiqueta.setAttribute("x", x);
            etiqueta.setAttribute("y", 45);
            etiqueta.setAttribute("text-anchor", "middle");
            etiqueta.setAttribute("fill", "currentColor");
            etiqueta.setAttribute("font-size", 13);

            etiqueta.textContent = "S" + (i + 1);

            grupo.appendChild(etiqueta);
        }
    }

    function analizarH3() {

        const fugaActiva = document.getElementById("fuga-activa").checked;

        if (!fugaActiva) {

            document.getElementById("mensaje-h3").textContent =
                "Primero activa una fuga en la configuración principal.";

            return;
        }

        ejecutarSimulacion();

        const estado = document.getElementById("estado-localizacion").textContent;
        const posicion = document.getElementById("posicion-estimada").textContent;
        const tramo = document.getElementById("tramo-estimado").textContent;
        const error = document.getElementById("error-localizacion").textContent;

        document.getElementById("estado-h3").textContent = estado;
        document.getElementById("posicion-h3").textContent = posicion;
        document.getElementById("tramo-h3").textContent = tramo;
        document.getElementById("error-h3").textContent = error;

        document.getElementById("mensaje-h3").textContent =
            "Análisis realizado con " + selector.value + " sensores.";

        document.getElementById("interpretacion-h3").textContent =
            "El resultado corresponde a la estimación calculada por el modelo. " +
            "Puedes cambiar la cantidad de sensores y repetir el análisis " +
            "para comparar la localización y el error obtenido.";
    }

    selector.addEventListener("change", actualizarDistribucionH3);

    boton.addEventListener("click", analizarH3);

    actualizarDistribucionH3();
}

// Dibujar sensores dinámicamente en la tubería 2D.

function dibujarSensoresTuberia(cantidad) {

    const grupo = document.getElementById("sensores-tuberia");

    if (!grupo) return;

    grupo.innerHTML = "";

    cantidad = Math.max(1, Math.min(20, Number(cantidad) || 1));

    const longitud = obtenerNumero("longitud");
    const espacio = 816 / (cantidad + 1);

    for (let i = 0; i < cantidad; i++) {

        const x = 42 + espacio * (i + 1);

        const distancia = longitud * (i + 1) / (cantidad + 1);

        const sensor = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );

        sensor.setAttribute("id", `sensor-${i + 1}`);

        sensor.setAttribute("data-distancia", distancia);

        const soporte = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );

        soporte.setAttribute("x1", x);
        soporte.setAttribute("y1", 145);
        soporte.setAttribute("x2", x);
        soporte.setAttribute("y2", 174);
        soporte.setAttribute("stroke", "#64748b");
        soporte.setAttribute("stroke-width", "3");

        const circulo = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );

        circulo.setAttribute("cx", x);
        circulo.setAttribute("cy", 187);
        circulo.setAttribute("r", "9");
        circulo.setAttribute("fill", "#f59e0b");
        circulo.setAttribute("stroke", "#ffffff");
        circulo.setAttribute("stroke-width", "2");

        const etiqueta = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );

        etiqueta.setAttribute("x", x);
        etiqueta.setAttribute("y", 130);
        etiqueta.setAttribute("text-anchor", "middle");
        etiqueta.setAttribute("fill", "#e2e8f0");
        etiqueta.setAttribute("font-size", "12");

        etiqueta.textContent = `S${i + 1}`;

        sensor.appendChild(soporte);
        sensor.appendChild(circulo);
        sensor.appendChild(etiqueta);

        grupo.appendChild(sensor);
    }
}

// Actualizar sensores cuando cambie la cantidad seleccionada.
const selectorSensores = document.getElementById("cantidad-sensores");

if (selectorSensores) {
    selectorSensores.addEventListener("change", () => {
        dibujarSensoresTuberia(selectorSensores.value);
    });

    // Dibujar la cantidad inicial de sensores.
    dibujarSensoresTuberia(selectorSensores.value);
}
// Actualizar posiciones de sensores cuando cambie la longitud.
const campoLongitud = document.getElementById("longitud");

if (campoLongitud) {
    campoLongitud.addEventListener("change", () => {
        if (selectorSensores) {
            dibujarSensoresTuberia(selectorSensores.value);
        }
    });
}
        // Calcular automáticamente al abrir la página.

        ejecutarSimulacion();

    }
);
