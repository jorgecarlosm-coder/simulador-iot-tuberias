
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


/* =========================================
   8. MODELO HIDRAULICO
========================================= */

function modeloHidraulico(parametros) {

    const {
        L,
        D,
        Q,
        Pin
    } = parametros;

    const A = calcularArea(D);

    const v = calcularVelocidad(Q, A);

    const Re = calcularReynolds(
        AGUA.rho,
        v,
        D,
        AGUA.mu
    );

    const f = calcularFactorFriccion(
        Re,
        AGUA.rugosidad,
        D
    );

    const perdida = calcularPerdidaPresion(
        f,
        L,
        D,
        AGUA.rho,
        v
    );

    const Pout = Pin - perdida;

    if (Pout <= 0) {
        throw new Error(
            "La presión de salida es negativa o nula. Revisa los parámetros."
        );
    }

    let regimen;

    if (Re < 2300) {
        regimen = "Laminar";
    } else if (Re <= 4000) {
        regimen = "Transición";
    } else {
        regimen = "Turbulento";
    }

    return {
        area: A,
        velocidad: v,
        reynolds: Re,
        factor: f,
        perdida: perdida,
        presionSalida: Pout,
        regimen: regimen
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


function modeloTermico(parametros) {

    const {
        L,
        D,
        Q,
        Tin,
        Tamb,
        U
    } = parametros;

    const mdot = AGUA.rho * Q;

    const puntos = [];

    const numeroPuntos = 101;

    for (let i = 0; i < numeroPuntos; i++) {

        const x =
            (L * i) / (numeroPuntos - 1);

        const T = calcularTemperatura(
            x,
            Tin,
            Tamb,
            D,
            U,
            mdot,
            AGUA.cp
        );

        puntos.push({
            distancia: x,
            temperatura: T
        });
    }

    return {
        temperaturaSalida: puntos[puntos.length - 1].temperatura,
        caudalMasico: mdot,
        perfil: puntos
    };
}


/* =========================================
   10. LEER PARAMETROS DE LA PAGINA
========================================= */

function leerParametros() {

    const p = {

        L: obtenerNumero("longitud"),

        D: obtenerNumero("diametro"),

        Q: obtenerNumero("caudal-entrada"),

        Pin: obtenerNumero("presion-entrada"),

        Tin: obtenerNumero("temperatura-entrada"),

        Tamb: obtenerNumero("temperatura-ambiente"),

        U: obtenerNumero("coeficiente-u")

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
        Régimen: ${hidraulica.regimen}
        <br>
        Factor de fricción: ${hidraulica.factor.toFixed(6)}
        <br>
        Pérdida de presión: ${hidraulica.perdida.toFixed(2)} Pa
        <br>
        Caudal másico: ${termica.caudalMasico.toFixed(4)} kg/s
        <br>
        Temperatura de salida: ${termica.temperaturaSalida.toFixed(4)} °C
    `;

    dibujarPerfilTermico(termica.perfil);
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
            parametros
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

        document.querySelectorAll(
            "[data-experimento]"
        ).forEach(boton => {

            boton.addEventListener(
                "click",
                function () {

                    consultarExperimento(
                        this.dataset.experimento
                    );

                }
            );

        });

        // Calcular automáticamente al abrir la página.

        ejecutarSimulacion();

    }
);
