
import numpy as np


def calcular_temperatura(
    x,
    temperatura_entrada,
    temperatura_ambiente,
    diametro,
    coeficiente_U,
    caudal_masico,
    cp
):
    """
    Calcula la temperatura del fluido a una distancia x.

    Modelo de transferencia de calor:
    T(x) = Tamb + (Tin - Tamb) * exp(-U*pi*D*x/(mdot*cp))

    Unidades:
    x: m
    temperaturas: °C
    diametro: m
    U: W/(m² K)
    caudal_masico: kg/s
    cp: J/(kg K)
    """

    if x < 0:
        raise ValueError("La distancia no puede ser negativa.")

    if diametro <= 0:
        raise ValueError("El diametro debe ser positivo.")

    if coeficiente_U < 0:
        raise ValueError("El coeficiente U no puede ser negativo.")

    if caudal_masico <= 0 or cp <= 0:
        raise ValueError("El caudal masico y cp deben ser positivos.")

    exponente = (
        coeficiente_U * np.pi * diametro * x
        / (caudal_masico * cp)
    )

    temperatura = (
        temperatura_ambiente
        + (temperatura_entrada - temperatura_ambiente)
        * np.exp(-exponente)
    )

    return float(temperatura)


def modelo_termico(
    temperatura_entrada,
    temperatura_ambiente,
    longitud,
    diametro,
    coeficiente_U,
    caudal,
    rho,
    cp,
    numero_puntos=101
):
    """
    Calcula el perfil de temperatura a lo largo de la tuberia.

    Retorna:
    - Caudal masico.
    - Distancias.
    - Temperaturas.
    - Temperatura de salida.
    - Variacion de temperatura.
    - Exponente termico.
    """

    if longitud <= 0:
        raise ValueError("La longitud debe ser positiva.")

    if caudal <= 0 or rho <= 0 or cp <= 0:
        raise ValueError("Caudal, densidad y cp deben ser positivos.")

    if numero_puntos < 2:
        raise ValueError("Se necesitan al menos dos puntos.")

    caudal_masico = rho * caudal

    distancias = np.linspace(
        0,
        longitud,
        numero_puntos
    )

    temperaturas = np.array([
        calcular_temperatura(
            x,
            temperatura_entrada,
            temperatura_ambiente,
            diametro,
            coeficiente_U,
            caudal_masico,
            cp
        )
        for x in distancias
    ])

    temperatura_salida = float(temperaturas[-1])

    exponente_termico = (
        coeficiente_U * np.pi * diametro * longitud
        / (caudal_masico * cp)
    )

    return {
        "caudal_masico": caudal_masico,
        "distancias": distancias,
        "temperaturas": temperaturas,
        "temperatura_entrada": temperatura_entrada,
        "temperatura_ambiente": temperatura_ambiente,
        "temperatura_salida": temperatura_salida,
        "variacion_temperatura": (
            temperatura_salida - temperatura_entrada
        ),
        "exponente_termico": exponente_termico
    }

