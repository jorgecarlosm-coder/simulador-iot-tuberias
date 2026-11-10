
import numpy as np

from modelos.modelo_hidraulico import modelo_hidraulico
from modelos.modelo_sensores import (
    simular_sensor_mc,
    configurar_sensor
)
from modelos.deteccion import (
    detectar_umbral,
    calcular_retardo_deteccion
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

INTERVALOS_MUESTREO = [20, 10, 5, 2, 1]

NUM_REPETICIONES = 30

TIEMPO_INICIO_FALLA = 60.0
TIEMPO_FINAL = 300.0

TOLERANCIA_UMBRAL = 1000.0


# --------------------------------------------------
# 2. CALCULAR PRESION NORMAL
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
# 3. CALCULAR PRESION CON OBSTRUCCION
# --------------------------------------------------

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
# 4. FUNCION PARA UNA REPETICION
# --------------------------------------------------

def ejecutar_repeticion(intervalo, semilla):

    rng = np.random.default_rng(semilla)

    # Generar tiempo de simulacion
    tiempos = np.arange(
        0.0,
        TIEMPO_FINAL + intervalo,
        intervalo
    )

    # Determinar cuando aparece la falla
    etiquetas_reales = (
        tiempos >= TIEMPO_INICIO_FALLA
    ).astype(int)

    # Construir la presion real
    presiones_reales = np.where(
        etiquetas_reales == 1,
        presion_falla,
        presion_normal
    )

    # Configurar sensor de presion
    sensor = configurar_sensor("presion").copy()

    # Simular las mediciones
    mediciones = simular_sensor_mc(
        presiones_reales,
        sensor,
        intervalo,
        rng
    )

    # Referencia del modelo en estado normal
    referencias = np.full(
        len(mediciones),
        presion_normal
    )

    # Detector por umbral
    alarmas = detectar_umbral(
        mediciones,
        referencias,
        TOLERANCIA_UMBRAL
    )

    alarmas = np.asarray(
        alarmas,
        dtype=int
    )

    # Calcular retardo
    retardo = calcular_retardo_deteccion(
        tiempos,
        etiquetas_reales,
        alarmas
    )

    # Calcular si se detecto la falla
    detectada = retardo is not None

    return {
        "intervalo": intervalo,
        "frecuencia": 1.0 / intervalo,
        "retardo": retardo,
        "detectada": detectada
    }


# --------------------------------------------------
# 5. EJECUTAR EXPERIMENTO H2
# --------------------------------------------------

def ejecutar_experimento_H2():

    resultados = []

    print("\n==========================================")
    print(" EXPERIMENTO H2: FRECUENCIA DE MUESTREO")
    print("==========================================")

    print(
        f"Presion normal: {presion_normal:.2f} Pa"
    )

    print(
        f"Presion con obstruccion: {presion_falla:.2f} Pa"
    )

    for intervalo in INTERVALOS_MUESTREO:

        repeticiones = []

        print(
            f"\nIntervalo de muestreo: {intervalo} segundos"
        )

        for repeticion in range(NUM_REPETICIONES):

            semilla = 2000 + repeticion

            resultado = ejecutar_repeticion(
                intervalo,
                semilla
            )

            repeticiones.append(resultado)

        retardos_detectados = [
            r["retardo"]
            for r in repeticiones
            if r["detectada"]
        ]

        tasa_deteccion = (
            len(retardos_detectados) /
            NUM_REPETICIONES
        )

        if len(retardos_detectados) > 0:

            retardo_promedio = float(
                np.mean(retardos_detectados)
            )

            desviacion = (
                float(np.std(
                    retardos_detectados,
                    ddof=1
                ))
                if len(retardos_detectados) > 1
                else 0.0
            )

        else:

            retardo_promedio = None
            desviacion = None

        resultados.append({
            "intervalo_segundos": intervalo,
            "frecuencia_hz": 1.0 / intervalo,
            "detecciones": len(retardos_detectados),
            "tasa_deteccion": tasa_deteccion,
            "retardo_promedio": retardo_promedio,
            "desviacion_estandar": desviacion,
            "repeticiones": NUM_REPETICIONES
        })

    # --------------------------------------------------
    # 6. MOSTRAR RESULTADOS
    # --------------------------------------------------

    print("\n==========================================")
    print(" RESULTADOS DEL EXPERIMENTO H2")
    print("==========================================")

    print(
        "Intervalo | Frecuencia | Detecciones | "
        "Retardo promedio | Desviacion"
    )

    for r in resultados:

        if r["retardo_promedio"] is None:

            retardo_texto = "Sin detecciones"
            desviacion_texto = "N/A"

        else:

            retardo_texto = (
                f"{r['retardo_promedio']:.3f} s"
            )

            desviacion_texto = (
                f"{r['desviacion_estandar']:.3f} s"
            )

        print(
            f"{r['intervalo_segundos']:>9} | "
            f"{r['frecuencia_hz']:>10.2f} Hz | "
            f"{r['detecciones']:>11}/30 | "
            f"{retardo_texto:>16} | "
            f"{desviacion_texto}"
        )

    print("\nEXPERIMENTO H2 FINALIZADO CORRECTAMENTE.")

    return resultados


if __name__ == "__main__":
    ejecutar_experimento_H2()

