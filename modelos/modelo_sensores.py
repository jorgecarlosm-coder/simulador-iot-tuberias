
import numpy as np


def simular_sensor_mc(valor_real, parametros, dt, rng):
    """
    Simula la medicion de un sensor IoT.

    Incorpora:
    - Sesgo (bias).
    - Ruido gaussiano.
    - Resolucion del sensor.
    - Tiempo de respuesta de primer orden.

    Parametros:
        valor_real: valor real o arreglo de valores reales.
        parametros: diccionario con las caracteristicas del sensor.
        dt: intervalo temporal entre muestras [s].
        rng: generador aleatorio de NumPy.

    Claves de parametros:
        bias: sesgo del sensor.
        ruido_std: desviacion estandar del ruido.
        resolucion: resolucion del sensor.
        tau: constante de tiempo [s].

    Retorna:
        Mediciones simuladas.
    """

    if dt <= 0:
        raise ValueError("dt debe ser mayor que cero.")

    bias = parametros["bias"]
    ruido_std = parametros["ruido_std"]
    resolucion = parametros["resolucion"]
    tau = parametros["tau"]

    if ruido_std < 0:
        raise ValueError("El ruido no puede ser negativo.")

    if resolucion <= 0:
        raise ValueError("La resolucion debe ser positiva.")

    if tau < 0:
        raise ValueError("La constante tau no puede ser negativa.")

    if not isinstance(rng, np.random.Generator):
        raise TypeError("rng debe ser un generador de NumPy.")

    valores = np.asarray(valor_real, dtype=float)

    if not np.all(np.isfinite(valores)):
        raise ValueError("Los valores reales deben ser finitos.")

    # Respuesta dinamica del sensor
    if valores.ndim == 0:
        valores = valores.reshape(1)

    valores_dinamicos = np.zeros_like(valores, dtype=float)

    if tau == 0:
        valores_dinamicos = valores.copy()

    else:
        alpha = 1 - np.exp(-dt / tau)

        valores_dinamicos[0] = valores[0]

        for i in range(1, len(valores)):
            valores_dinamicos[i] = (
                valores_dinamicos[i - 1]
                + alpha * (
                    valores[i] - valores_dinamicos[i - 1]
                )
            )

    # Incorporacion del sesgo
    valores_con_bias = valores_dinamicos + bias

    # Ruido gaussiano
    ruido = rng.normal(
        loc=0,
        scale=ruido_std,
        size=valores.shape
    )

    valores_con_ruido = valores_con_bias + ruido

    # Cuantizacion segun la resolucion
    mediciones = (
        np.round(valores_con_ruido / resolucion)
        * resolucion
    )

    if np.asarray(valor_real).ndim == 0:
        return float(mediciones[0])

    return mediciones


def configurar_sensor(tipo):
    """
    Devuelve parametros ilustrativos para cada sensor.
    """

    sensores = {
        "presion": {
            "bias": 100,
            "ruido_std": 150,
            "resolucion": 100,
            "tau": 2
        },

        "caudal": {
            "bias": 0.00001,
            "ruido_std": 0.00002,
            "resolucion": 0.00001,
            "tau": 3
        },

        "temperatura": {
            "bias": 0.2,
            "ruido_std": 0.15,
            "resolucion": 0.1,
            "tau": 5
        }
    }

    if tipo not in sensores:
        raise ValueError("Tipo de sensor no reconocido.")

    return sensores[tipo].copy()

