
import numpy as np

from modelos.modelo_hidraulico import modelo_hidraulico
from modelos.modelo_termico import modelo_termico
from modelos.modelo_sensores import (
    configurar_sensor,
    simular_sensor_mc
)
from modelos.deteccion import calcular_metricas


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
    "rugosidad": 1.5e-6,
    "U": 5.0,
    "Tin": 60.0,
    "Tamb": 20.0,
    "cp": 4182.0
}

DT = 1.0

MUESTRAS_NORMALES = 60
MUESTRAS_FALLA = 120

NUM_REPETICIONES = 30

UMBRAL_SIGMA = 3.0

TIPOS_FALLA = [
    "fuga",
    "obstruccion",
    "perdida_aislamiento",
    "sobrecalentamiento"
]


# --------------------------------------------------
# 2. CALCULAR LAS VARIABLES FISICAS
# --------------------------------------------------

def calcular_variables(parametros):

    hidraulica = modelo_hidraulico(
        longitud=parametros["longitud"],
        diametro=parametros["diametro"],
        caudal=parametros["caudal"],
        presion_entrada=parametros["presion_entrada"],
        rho=parametros["rho"],
        mu=parametros["mu"],
        rugosidad=parametros["rugosidad"]
    )

    termica = modelo_termico(
    temperatura_entrada=parametros["Tin"],
    temperatura_ambiente=parametros["Tamb"],
    longitud=parametros["longitud"],
    diametro=parametros["diametro"],
    coeficiente_U=parametros["U"],
    caudal=parametros["caudal"],
    rho=parametros["rho"],
    cp=parametros["cp"],
    numero_puntos=101
    )

    return {
        "presion": hidraulica["presion_salida"],
        "caudal": parametros["caudal"],
        "temperatura": termica["temperatura_salida"]
    }


# --------------------------------------------------
# 3. CALCULAR EL ESTADO NORMAL
# --------------------------------------------------

VARIABLES_NORMALES = calcular_variables(PARAMETROS)


# --------------------------------------------------
# 4. MODIFICAR LOS PARAMETROS SEGUN LA FALLA
# --------------------------------------------------

def aplicar_falla(tipo_falla):

    p = PARAMETROS.copy()

    if tipo_falla == "fuga":

        Cd = 0.62
        area_fuga = 1e-5
        diferencia_presion = 100000.0

        caudal_fuga = (
            Cd * area_fuga *
            np.sqrt(
                2.0 * diferencia_presion / p["rho"]
            )
        )

        p["caudal"] = p["caudal"] - caudal_fuga

    elif tipo_falla == "obstruccion":

        reduccion_area = 0.30

        p["diametro"] = (
            p["diametro"] *
            np.sqrt(1.0 - reduccion_area)
        )

    elif tipo_falla == "perdida_aislamiento":

        factor_incremento_U = 3.0

        p["U"] = (
            p["U"] * factor_incremento_U
        )

    elif tipo_falla == "sobrecalentamiento":

        incremento_temperatura = 15.0

        p["Tin"] = (
            p["Tin"] + incremento_temperatura
        )

    else:

        raise ValueError(
            "Tipo de falla no reconocido."
        )

    if p["caudal"] <= 0:

        raise ValueError(
            "El caudal resultante debe ser positivo."
        )

    return p


# --------------------------------------------------
# 5. SIMULAR LOS TRES SENSORES
# --------------------------------------------------

def simular_sensores(
    valores_reales,
    rng
):

    mediciones = {}

    for tipo in [
        "presion",
        "caudal",
        "temperatura"
    ]:

        sensor = configurar_sensor(tipo)

        mediciones[tipo] = simular_sensor_mc(
            valores_reales[tipo],
            sensor,
            DT,
            rng
        )

    return mediciones


# --------------------------------------------------
# 6. DETECTAR ANOMALIAS
# --------------------------------------------------

def detectar_falla(mediciones):

    alarmas = np.zeros(
        MUESTRAS_NORMALES + MUESTRAS_FALLA,
        dtype=bool
    )

    for tipo in [
        "presion",
        "caudal",
        "temperatura"
    ]:

        sensor = configurar_sensor(tipo)

        referencia = (
            VARIABLES_NORMALES[tipo] +
            sensor["bias"]
        )

        tolerancia = max(
            UMBRAL_SIGMA * sensor["ruido_std"],
            sensor["resolucion"]
        )

        residuos = np.abs(
            mediciones[tipo] - referencia
        )

        alarmas = alarmas | (
            residuos > tolerancia
        )

    return alarmas


# --------------------------------------------------
# 7. EJECUTAR UNA REPETICION
# --------------------------------------------------

def ejecutar_repeticion(tipo_falla, semilla):

    rng = np.random.default_rng(semilla)

    parametros_falla = aplicar_falla(
        tipo_falla
    )

    variables_falla = calcular_variables(
        parametros_falla
    )

    # Crear las señales reales:
    # primero estado normal y luego estado con falla.

    valores_reales = {}

    for variable in [
        "presion",
        "caudal",
        "temperatura"
    ]:

        valores_reales[variable] = np.concatenate([
            np.full(
                MUESTRAS_NORMALES,
                VARIABLES_NORMALES[variable]
            ),
            np.full(
                MUESTRAS_FALLA,
                variables_falla[variable]
            )
        ])

    mediciones = simular_sensores(
        valores_reales,
        rng
    )

    alarmas = detectar_falla(
        mediciones
    )

    etiquetas_reales = np.concatenate([
        np.zeros(MUESTRAS_NORMALES, dtype=int),
        np.ones(MUESTRAS_FALLA, dtype=int)
    ])

    metricas = calcular_metricas(
        etiquetas_reales,
        alarmas.astype(int)
    )

    return metricas


# --------------------------------------------------
# 8. EJECUTAR EXPERIMENTO H4
# --------------------------------------------------

def ejecutar_experimento_H4():

    resultados = []

    print("\n==========================================")
    print(" EXPERIMENTO H4: FALLAS HIDRAULICAS Y TERMICAS")
    print("==========================================")

    print("\nESTADO NORMAL")

    for variable, valor in VARIABLES_NORMALES.items():

        print(
            f"{variable}: {valor:.4f}"
        )

    for tipo_falla in TIPOS_FALLA:

        repeticiones = []

        print(
            f"\nTipo de falla: {tipo_falla}"
        )

        for repeticion in range(NUM_REPETICIONES):

            semilla = 4000 + repeticion

            metricas = ejecutar_repeticion(
                tipo_falla,
                semilla
            )

            repeticiones.append(metricas)

        nombres_metricas = [
            "precision",
            "recall",
            "f1",
            "tasa_falsas_alarmas",
            "accuracy"
        ]

        resumen = {
            "tipo_falla": tipo_falla,
            "repeticiones": NUM_REPETICIONES
        }

        for nombre in nombres_metricas:

            valores = np.array([
                r[nombre]
                for r in repeticiones
            ])

            resumen[nombre + "_media"] = float(
                np.mean(valores)
            )

            resumen[nombre + "_desviacion"] = (
                float(np.std(valores, ddof=1))
            )

        resultados.append(resumen)

        print("30 repeticiones completadas.")

    # --------------------------------------------------
    # 9. MOSTRAR RESULTADOS
    # --------------------------------------------------

    print("\n==========================================")
    print(" RESULTADOS DEL EXPERIMENTO H4")
    print("==========================================")

    for r in resultados:

        print(
            f"\nFalla: {r['tipo_falla']}"
        )

        print(
            f"Precision: "
            f"{r['precision_media']:.4f} "
            f"+/- {r['precision_desviacion']:.4f}"
        )

        print(
            f"Recall: "
            f"{r['recall_media']:.4f} "
            f"+/- {r['recall_desviacion']:.4f}"
        )

        print(
            f"F1: "
            f"{r['f1_media']:.4f} "
            f"+/- {r['f1_desviacion']:.4f}"
        )

        print(
            f"Tasa de falsas alarmas: "
            f"{r['tasa_falsas_alarmas_media']:.4f}"
        )

        print(
            f"Accuracy: "
            f"{r['accuracy_media']:.4f}"
        )

    print("\nEXPERIMENTO H4 FINALIZADO CORRECTAMENTE.")

    return resultados


if __name__ == "__main__":
    ejecutar_experimento_H4()

