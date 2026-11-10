
import numpy as np

from modelos.modelo_hidraulico import modelo_hidraulico
from modelos.modelo_sensores import (
    simular_sensor_mc,
    configurar_sensor
)
from modelos.deteccion import (
    detectar_umbral,
    detectar_residuos,
    calcular_metricas
)


# --------------------------------------------------
# 1. PARAMETROS DEL SISTEMA
# --------------------------------------------------

PARAMETROS = {
    "longitud": 100.0,
    "diametro": 0.05,
    "caudal": 0.001,
    "presion_entrada": 300000.0,
    "rho": 998.2,
    "mu": 0.001002,
    "rugosidad": 1.5e-6
}

DT = 1.0
MUESTRAS_CALIBRACION = 60
MUESTRAS_EVALUACION_NORMAL = 60
MUESTRAS_EVALUACION_FALLA = 120

NUM_REPETICIONES = 30

# Tolerancia fija del detector por umbral
TOLERANCIA_UMBRAL = 1000.0

# Umbral del detector basado en residuos
UMBRAL_SIGMA = 3.0


# --------------------------------------------------
# 2. CALCULAR LA PRESION NORMAL
# --------------------------------------------------

resultado_normal = modelo_hidraulico(
    longitud=PARAMETROS["longitud"],
    diametro=PARAMETROS["diametro"],
    caudal=PARAMETROS["caudal"],
    presion_entrada=PARAMETROS["presion_entrada"],
    rho=PARAMETROS["rho"],
    mu=PARAMETROS["mu"],
    rugosidad=PARAMETROS["rugosidad"]
)

presion_normal = resultado_normal["presion_salida"]


# --------------------------------------------------
# 3. SIMULAR UNA OBSTRUCCION
# --------------------------------------------------

# Se reduce el area transversal en un 30 %
reduccion_area = 0.30

diametro_obstruido = (
    PARAMETROS["diametro"] *
    np.sqrt(1.0 - reduccion_area)
)

resultado_falla = modelo_hidraulico(
    longitud=PARAMETROS["longitud"],
    diametro=diametro_obstruido,
    caudal=PARAMETROS["caudal"],
    presion_entrada=PARAMETROS["presion_entrada"],
    rho=PARAMETROS["rho"],
    mu=PARAMETROS["mu"],
    rugosidad=PARAMETROS["rugosidad"]
)

presion_falla = resultado_falla["presion_salida"]


# --------------------------------------------------
# 4. NIVELES DE RUIDO
# --------------------------------------------------

NIVELES_RUIDO = {
    "bajo": 0.5,
    "medio": 1.0,
    "alto": 2.0
}


# --------------------------------------------------
# 5. EJECUTAR UNA REPETICION
# --------------------------------------------------

def ejecutar_repeticion(nivel_ruido, semilla):

    rng = np.random.default_rng(semilla)

    # Configuracion del sensor de presion
    sensor = configurar_sensor("presion").copy()

    # Modificar solamente la desviacion del ruido
    sensor["ruido_std"] *= NIVELES_RUIDO[nivel_ruido]

    # ----------------------------------------------
    # CALIBRACION CON EL SISTEMA EN ESTADO NORMAL
    # ----------------------------------------------

    valores_calibracion = np.full(
        MUESTRAS_CALIBRACION,
        presion_normal
    )

    mediciones_calibracion = simular_sensor_mc(
        valores_calibracion,
        sensor,
        DT,
        rng
    )

    residuos_calibracion = (
        mediciones_calibracion - presion_normal
    )

    sigma_residuo = np.std(
        residuos_calibracion,
        ddof=1
    )

    # Evitar una desviacion igual a cero
    sigma_residuo = max(
        float(sigma_residuo),
        sensor["resolucion"]
    )

    # ----------------------------------------------
    # EVALUACION: PRIMERO NORMAL Y DESPUES CON FALLA
    # ----------------------------------------------

    valores_reales = np.concatenate([
        np.full(
            MUESTRAS_EVALUACION_NORMAL,
            presion_normal
        ),
        np.full(
            MUESTRAS_EVALUACION_FALLA,
            presion_falla
        )
    ])

    mediciones = simular_sensor_mc(
        valores_reales,
        sensor,
        DT,
        rng
    )

    referencias = np.full(
        len(mediciones),
        presion_normal
    )

    # Etiquetas reales: 0 normal y 1 falla
    etiquetas_reales = np.concatenate([
        np.zeros(MUESTRAS_EVALUACION_NORMAL, dtype=int),
        np.ones(MUESTRAS_EVALUACION_FALLA, dtype=int)
    ])

    # ----------------------------------------------
    # DETECTOR 1: UMBRAL FIJO
    # ----------------------------------------------

    alarmas_umbral = detectar_umbral(
        mediciones,
        referencias,
        TOLERANCIA_UMBRAL
    )

    # ----------------------------------------------
    # DETECTOR 2: RESIDUOS DEL MODELO
    # ----------------------------------------------

    predicciones_modelo = referencias

    alarmas_residuo = detectar_residuos(
        mediciones,
        predicciones_modelo,
        sigma_residuo,
        UMBRAL_SIGMA
    )

    # ----------------------------------------------
    # CALCULAR METRICAS
    # ----------------------------------------------

    metricas_umbral = calcular_metricas(
        etiquetas_reales,
        np.asarray(alarmas_umbral, dtype=int)
    )

    metricas_residuo = calcular_metricas(
        etiquetas_reales,
        np.asarray(alarmas_residuo, dtype=int)
    )

    return {
        "f1_umbral": metricas_umbral["f1"],
        "f1_residuo": metricas_residuo["f1"],
        "precision_umbral": metricas_umbral["precision"],
        "precision_residuo": metricas_residuo["precision"],
        "recall_umbral": metricas_umbral["recall"],
        "recall_residuo": metricas_residuo["recall"],
        "falsas_alarmas_umbral": metricas_umbral["tasa_falsas_alarmas"],
        "falsas_alarmas_residuo": metricas_residuo["tasa_falsas_alarmas"]
    }


# --------------------------------------------------
# 6. EXPERIMENTO H1: 30 REPETICIONES POR NIVEL
# --------------------------------------------------

def ejecutar_experimento_H1():

    resultados = []

    print("\n==========================================")
    print(" EXPERIMENTO H1: EFECTO DEL RUIDO")
    print("==========================================")

    print(f"Presion normal: {presion_normal:.2f} Pa")
    print(f"Presion con obstruccion: {presion_falla:.2f} Pa")
    print(
        f"Variacion de presion: "
        f"{presion_falla - presion_normal:.2f} Pa"
    )

    for nivel in NIVELES_RUIDO:

        repeticiones = []

        print(f"\nNivel de ruido: {nivel}")

        for repeticion in range(NUM_REPETICIONES):

            # Semillas emparejadas entre niveles
            semilla = 1000 + repeticion

            resultado = ejecutar_repeticion(
                nivel,
                semilla
            )

            repeticiones.append(resultado)

        # Promedios y desviaciones estandar
        metricas = repeticiones[0].keys()

        for metrica in metricas:

            valores = np.array([
                r[metrica] for r in repeticiones
            ])

            resultados.append({
                "nivel_ruido": nivel,
                "metrica": metrica,
                "media": float(np.mean(valores)),
                "desviacion_estandar": float(
                    np.std(valores, ddof=1)
                ),
                "repeticiones": NUM_REPETICIONES
            })

        print("30 repeticiones completadas.")

    # ----------------------------------------------
    # MOSTRAR RESULTADOS
    # ----------------------------------------------

    print("\n==========================================")
    print(" RESULTADOS PROMEDIO DE H1")
    print("==========================================")

    for nivel in NIVELES_RUIDO:

        print(f"\nNivel de ruido: {nivel}")

        for metrica in [
            "f1_umbral",
            "f1_residuo",
            "recall_umbral",
            "recall_residuo",
            "falsas_alarmas_umbral",
            "falsas_alarmas_residuo"
        ]:

            fila = next(
                r for r in resultados
                if r["nivel_ruido"] == nivel
                and r["metrica"] == metrica
            )

            print(
                f"{metrica}: "
                f"{fila['media']:.4f} "
                f"+/- {fila['desviacion_estandar']:.4f}"
            )

    print("\nEXPERIMENTO H1 FINALIZADO CORRECTAMENTE.")

    return resultados


if __name__ == "__main__":
    ejecutar_experimento_H1()

