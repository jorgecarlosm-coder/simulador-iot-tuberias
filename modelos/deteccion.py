
import numpy as np


def validar_series(mediciones, referencias):
    """
    Comprueba que las mediciones y referencias
    tengan la misma longitud y valores finitos.
    """

    mediciones = np.asarray(mediciones, dtype=float)
    referencias = np.asarray(referencias, dtype=float)

    if mediciones.ndim != 1 or referencias.ndim != 1:
        raise ValueError("Las series deben ser unidimensionales.")

    if len(mediciones) != len(referencias):
        raise ValueError(
            "Las mediciones y referencias deben tener igual longitud."
        )

    if len(mediciones) == 0:
        raise ValueError("Las series no pueden estar vacias.")

    if not np.all(np.isfinite(mediciones)):
        raise ValueError("Las mediciones deben ser finitas.")

    if not np.all(np.isfinite(referencias)):
        raise ValueError("Las referencias deben ser finitas.")

    return mediciones, referencias


def detectar_umbral(mediciones, referencias, tolerancia):
    """
    Detecta anomalías mediante una diferencia absoluta.

    Se activa una alarma cuando:

        abs(medicion - referencia) > tolerancia

    La tolerancia debe expresarse en la misma unidad
    de la variable medida.
    """

    mediciones, referencias = validar_series(
        mediciones,
        referencias
    )

    if tolerancia <= 0:
        raise ValueError("La tolerancia debe ser positiva.")

    diferencias = np.abs(mediciones - referencias)

    alarmas = diferencias > tolerancia

    return alarmas


def detectar_residuos(
    mediciones,
    predicciones,
    sigma_residuo,
    umbral_sigma=3.0
):
    """
    Detecta anomalías mediante residuos normalizados.

    Residuo:
        r = medicion - prediccion

    Alarma:
        abs(r) > umbral_sigma * sigma_residuo
    """

    mediciones, predicciones = validar_series(
        mediciones,
        predicciones
    )

    if sigma_residuo <= 0:
        raise ValueError(
            "La desviacion del residuo debe ser positiva."
        )

    if umbral_sigma <= 0:
        raise ValueError(
            "El umbral sigma debe ser positivo."
        )

    residuos = mediciones - predicciones

    residuos_normalizados = (
        np.abs(residuos) / sigma_residuo
    )

    alarmas = residuos_normalizados > umbral_sigma

    return alarmas


def calcular_metricas(y_real, y_predicho):
    """
    Calcula las metricas de clasificacion binaria:

    - Verdaderos positivos (VP)
    - Verdaderos negativos (VN)
    - Falsos positivos (FP)
    - Falsos negativos (FN)
    - Precision
    - Recall
    - F1
    - Tasa de falsas alarmas
    - Exactitud

    Convencion:
        1 = falla
        0 = funcionamiento normal
    """

    y_real = np.asarray(y_real, dtype=bool)
    y_predicho = np.asarray(y_predicho, dtype=bool)

    if y_real.ndim != 1 or y_predicho.ndim != 1:
        raise ValueError("Las etiquetas deben ser series unidimensionales.")

    if len(y_real) != len(y_predicho):
        raise ValueError("Las series deben tener igual longitud.")

    if len(y_real) == 0:
        raise ValueError("Se necesitan datos para calcular metricas.")

    VP = int(np.sum(y_real & y_predicho))
    VN = int(np.sum(~y_real & ~y_predicho))
    FP = int(np.sum(~y_real & y_predicho))
    FN = int(np.sum(y_real & ~y_predicho))

    precision = VP / (VP + FP) if VP + FP > 0 else 0.0

    recall = VP / (VP + FN) if VP + FN > 0 else 0.0

    f1 = (
        2 * precision * recall / (precision + recall)
        if precision + recall > 0
        else 0.0
    )

    tasa_falsas_alarmas = (
        FP / (FP + VN)
        if FP + VN > 0
        else 0.0
    )

    exactitud = (VP + VN) / len(y_real)

    return {
        "VP": VP,
        "VN": VN,
        "FP": FP,
        "FN": FN,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "tasa_falsas_alarmas": tasa_falsas_alarmas,
        "exactitud": exactitud
    }


def calcular_retardo_deteccion(
    tiempos,
    y_real,
    y_predicho
):
    """
    Calcula el tiempo transcurrido entre el inicio
    de la falla y su primera deteccion.

    Retorna None si no se detecta la falla.
    """

    tiempos = np.asarray(tiempos, dtype=float)
    y_real = np.asarray(y_real, dtype=bool)
    y_predicho = np.asarray(y_predicho, dtype=bool)

    if not (
        tiempos.ndim == 1
        and y_real.ndim == 1
        and y_predicho.ndim == 1
    ):
        raise ValueError("Las entradas deben ser series unidimensionales.")

    if not (
        len(tiempos) == len(y_real) == len(y_predicho)
    ):
        raise ValueError("Las series deben tener igual longitud.")

    if len(tiempos) == 0:
        raise ValueError("Se necesitan datos temporales.")

    if not np.all(np.isfinite(tiempos)):
        raise ValueError("Los tiempos deben ser finitos.")

    if np.any(np.diff(tiempos) < 0):
        raise ValueError("Los tiempos deben estar ordenados.")

    indices_falla = np.flatnonzero(y_real)

    if len(indices_falla) == 0:
        return None

    inicio_falla = indices_falla[0]

    indices_deteccion = np.flatnonzero(
        y_predicho[inicio_falla:]
    )

    if len(indices_deteccion) == 0:
        return None

    primera_deteccion = (
        inicio_falla + indices_deteccion[0]
    )

    return float(
        tiempos[primera_deteccion] - tiempos[inicio_falla]
    )

