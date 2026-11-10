
import numpy as np

from modelos.modelo_hidraulico import modelo_hidraulico
from modelos.modelo_sensores import configurar_sensor


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

CANTIDADES_SENSORES = [1, 2, 3, 5, 8]

NUM_REPETICIONES = 30

# Ubicacion real de la obstruccion
UBICACION_FALLA = 0.63

# Reduccion del area transversal
REDUCCION_AREA = 0.30

# Multiplicador del ruido para el umbral
UMBRAL_SIGMA = 3.0


# --------------------------------------------------
# 2. MODELO HIDRAULICO NORMAL
# --------------------------------------------------

normal = modelo_hidraulico(
    longitud=PARAMETROS["longitud"],
    diametro=PARAMETROS["diametro"],
    caudal=PARAMETROS["caudal"],
    presion_entrada=PARAMETROS["presion_entrada"],
    rho=PARAMETROS["rho"],
    mu=PARAMETROS["mu"],
    rugosidad=PARAMETROS["rugosidad"]
)

# Presion normal al final de la tuberia
perdida_normal = normal["perdida_presion"]

# Gradiente de perdida de presion normal
gradiente_normal = (
    perdida_normal / PARAMETROS["longitud"]
)


# --------------------------------------------------
# 3. MODELO HIDRAULICO CON OBSTRUCCION
# --------------------------------------------------

diametro_obstruido = (
    PARAMETROS["diametro"] *
    np.sqrt(1.0 - REDUCCION_AREA)
)

obstruido = modelo_hidraulico(
    longitud=PARAMETROS["longitud"],
    diametro=diametro_obstruido,
    caudal=PARAMETROS["caudal"],
    presion_entrada=PARAMETROS["presion_entrada"],
    rho=PARAMETROS["rho"],
    mu=PARAMETROS["mu"],
    rugosidad=PARAMETROS["rugosidad"]
)

gradiente_obstruido = (
    obstruido["perdida_presion"] /
    PARAMETROS["longitud"]
)


# --------------------------------------------------
# 4. PERFIL DE PRESION A LO LARGO DE LA TUBERIA
# --------------------------------------------------

def calcular_perfil_presion(posiciones, con_falla):

    presiones = []

    longitud = PARAMETROS["longitud"]
    pin = PARAMETROS["presion_entrada"]

    posicion_falla = UBICACION_FALLA * longitud

    for x in posiciones:

        if not con_falla:

            presion = pin - gradiente_normal * x

        elif x < posicion_falla:

            # Antes de la obstruccion
            presion = pin - gradiente_normal * x

        else:

            # Despues de la obstruccion
            perdida_antes = (
                gradiente_normal * posicion_falla
            )

            perdida_despues = (
                gradiente_obstruido *
                (x - posicion_falla)
            )

            presion = (
                pin - perdida_antes - perdida_despues
            )

        presiones.append(presion)

    return np.array(presiones, dtype=float)


# --------------------------------------------------
# 5. SIMULAR LAS MEDICIONES DE LOS SENSORES
# --------------------------------------------------

def simular_mediciones(presiones_reales, sensor, rng):

    ruido = rng.normal(
        0.0,
        sensor["ruido_std"],
        size=len(presiones_reales)
    )

    mediciones = (
        presiones_reales +
        sensor["bias"] +
        ruido
    )

    resolucion = sensor["resolucion"]

    mediciones = (
        np.round(mediciones / resolucion) *
        resolucion
    )

    return mediciones


# --------------------------------------------------
# 6. LOCALIZAR LA OBSTRUCCION
# --------------------------------------------------

def localizar_falla(
    posiciones,
    presiones_medidas,
    presiones_normales,
    tolerancia
):

    residuos = (
        presiones_medidas -
        presiones_normales
    )

    indices_anomalos = np.where(
        residuos < -tolerancia
    )[0]

    if len(indices_anomalos) == 0:

        return None

    primer_indice = int(indices_anomalos[0])

    # Con un solo sensor se puede detectar,
    # pero no localizar espacialmente la falla.
    if len(posiciones) < 2:

        return None

    # Si la primera posicion ya es anomala,
    # no existe un sensor anterior para delimitar
    # el intervalo de localizacion.
    if primer_indice == 0:

        return None

    posicion_anterior = posiciones[
        primer_indice - 1
    ]

    posicion_anomala = posiciones[
        primer_indice
    ]

    estimacion = (
        posicion_anterior + posicion_anomala
    ) / 2.0

    return float(estimacion)


# --------------------------------------------------
# 7. EJECUTAR UNA REPETICION
# --------------------------------------------------

def ejecutar_repeticion(cantidad, semilla):

    rng = np.random.default_rng(semilla)

    longitud = PARAMETROS["longitud"]

    # Ubicar los sensores de manera uniforme.
    # Para un sensor se utiliza el extremo final.
    if cantidad == 1:

        posiciones = np.array([longitud])

    else:

        posiciones = np.linspace(
            0.0,
            longitud,
            cantidad
        )

    # Perfiles normal y con obstruccion
    presiones_normales = calcular_perfil_presion(
        posiciones,
        con_falla=False
    )

    presiones_reales = calcular_perfil_presion(
        posiciones,
        con_falla=True
    )

    sensor = configurar_sensor("presion")

    # Medicion simultanea en distintas posiciones
    mediciones = simular_mediciones(
        presiones_reales,
        sensor,
        rng
    )

    # Tolerancia basada en el ruido y la resolucion
    tolerancia = (
        UMBRAL_SIGMA * sensor["ruido_std"] +
        sensor["resolucion"]
    )

    estimacion = localizar_falla(
        posiciones,
        mediciones,
        presiones_normales,
        tolerancia
    )

    if estimacion is None:

        error = None

    else:

        posicion_real = (
            UBICACION_FALLA * longitud
        )

        error = abs(
            estimacion - posicion_real
        )

    return {
        "cantidad_sensores": cantidad,
        "posicion_estimada": estimacion,
        "error_localizacion": error,
        "localizada": error is not None
    }


# --------------------------------------------------
# 8. EXPERIMENTO H3: 30 REPETICIONES
# --------------------------------------------------

def ejecutar_experimento_H3():

    resultados = []

    print("\n==========================================")
    print(" EXPERIMENTO H3: CANTIDAD DE SENSORES")
    print("==========================================")

    print(
        f"Ubicacion real de falla: "
        f"{UBICACION_FALLA * PARAMETROS['longitud']:.2f} m"
    )

    print(
        f"Gradiente normal: {gradiente_normal:.2f} Pa/m"
    )

    print(
        f"Gradiente con obstruccion: "
        f"{gradiente_obstruido:.2f} Pa/m"
    )

    for cantidad in CANTIDADES_SENSORES:

        errores = []
        localizaciones = 0

        print(
            f"\nCantidad de sensores: {cantidad}"
        )

        for repeticion in range(NUM_REPETICIONES):

            semilla = 3000 + repeticion

            resultado = ejecutar_repeticion(
                cantidad,
                semilla
            )

            if resultado["localizada"]:

                errores.append(
                    resultado["error_localizacion"]
                )

                localizaciones += 1

        tasa_localizacion = (
            localizaciones / NUM_REPETICIONES
        )

        if len(errores) > 0:

            error_promedio = float(
                np.mean(errores)
            )

            desviacion = (
                float(np.std(errores, ddof=1))
                if len(errores) > 1
                else 0.0
            )

        else:

            error_promedio = None
            desviacion = None

        resultados.append({
            "sensores": cantidad,
            "localizaciones": localizaciones,
            "tasa_localizacion": tasa_localizacion,
            "error_promedio_m": error_promedio,
            "desviacion_estandar_m": desviacion,
            "repeticiones": NUM_REPETICIONES
        })

    # --------------------------------------------------
    # 9. MOSTRAR RESULTADOS
    # --------------------------------------------------

    print("\n==========================================")
    print(" RESULTADOS DEL EXPERIMENTO H3")
    print("==========================================")

    print(
        "Sensores | Localizaciones | Tasa | "
        "Error promedio | Desviacion"
    )

    for r in resultados:

        if r["error_promedio_m"] is None:

            error_texto = "No localizado"
            desviacion_texto = "N/A"

        else:

            error_texto = (
                f"{r['error_promedio_m']:.2f} m"
            )

            desviacion_texto = (
                f"{r['desviacion_estandar_m']:.2f} m"
            )

        print(
            f"{r['sensores']:>8} | "
            f"{r['localizaciones']:>5}/30 | "
            f"{r['tasa_localizacion']:.2f} | "
            f"{error_texto:>14} | "
            f"{desviacion_texto}"
        )

    print("\nEXPERIMENTO H3 FINALIZADO CORRECTAMENTE.")

    return resultados


if __name__ == "__main__":
    ejecutar_experimento_H3()

