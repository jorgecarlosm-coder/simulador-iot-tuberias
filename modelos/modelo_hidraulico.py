import numpy as np


def calcular_area(diametro):
    """
    Calcula el area transversal interna de la tuberia.

    Parametro:
        diametro : diametro interno [m]

    Retorna:
        area : area transversal [m^2]
    """

    area = np.pi * diametro**2 / 4

    return area


def calcular_velocidad(caudal, diametro):
    """
    Calcula la velocidad media del fluido.

    Parametros:
        caudal   : caudal volumetrico [m^3/s]
        diametro : diametro interno [m]

    Retorna:
        velocidad : velocidad media [m/s]
    """

    area = calcular_area(diametro)

    velocidad = caudal / area

    return velocidad


def calcular_reynolds(rho, velocidad, diametro, mu):
    """
    Calcula el numero de Reynolds.

    Parametros:
        rho       : densidad [kg/m^3]
        velocidad : velocidad media [m/s]
        diametro  : diametro interno [m]
        mu        : viscosidad dinamica [Pa*s]

    Retorna:
        Re : numero de Reynolds
    """

    Re = rho * velocidad * diametro / mu

    return Re


def determinar_regimen(Re):
    """
    Determina el regimen del flujo a partir de Reynolds.

    Re < 2300       -> Laminar
    2300 <= Re < 4000 -> Transicion
    Re >= 4000      -> Turbulento
    """

    if Re < 2300:
        return "Laminar"

    elif Re < 4000:
        return "Transicion"

    else:
        return "Turbulento"


def calcular_factor_friccion(Re, rugosidad, diametro):
    """
    Calcula el factor de friccion de Darcy.

    Para flujo laminar:
        f = 64/Re

    Para flujo turbulento:
        Se utiliza la ecuacion de Swamee-Jain.
    """

    if Re <= 0:
        raise ValueError("El numero de Reynolds debe ser mayor que cero.")

    if Re < 2300:

        f = 64 / Re

    else:

        termino = (
            rugosidad / (3.7 * diametro)
            + 5.74 / (Re**0.9)
        )

        f = 0.25 / (np.log10(termino) ** 2)

    return f


def calcular_perdida_presion(
    f,
    longitud,
    diametro,
    rho,
    velocidad
):
    """
    Calcula la perdida de presion por friccion
    utilizando Darcy-Weisbach.

    DeltaP = f * (L/D) * (rho*v^2/2)
    """

    delta_p = (
        f
        * (longitud / diametro)
        * (rho * velocidad**2 / 2)
    )

    return delta_p


def calcular_presion_salida(presion_entrada, perdida_presion):
    """
    Calcula la presion de salida de la tuberia.
    """

    presion_salida = presion_entrada - perdida_presion

    return presion_salida


def modelo_hidraulico(
    longitud,
    diametro,
    caudal,
    presion_entrada,
    rho,
    mu,
    rugosidad
):
    """
    Ejecuta todo el modelo hidraulico.

    Retorna un diccionario con las principales
    variables calculadas.
    """

    area = calcular_area(diametro)

    velocidad = calcular_velocidad(
        caudal,
        diametro
    )

    Re = calcular_reynolds(
        rho,
        velocidad,
        diametro,
        mu
    )

    regimen = determinar_regimen(Re)

    factor_friccion = calcular_factor_friccion(
        Re,
        rugosidad,
        diametro
    )

    perdida_presion = calcular_perdida_presion(
        factor_friccion,
        longitud,
        diametro,
        rho,
        velocidad
    )

    presion_salida = calcular_presion_salida(
        presion_entrada,
        perdida_presion
    )

    return {
        "area": area,
        "velocidad": velocidad,
        "reynolds": Re,
        "regimen": regimen,
        "factor_friccion": factor_friccion,
        "perdida_presion": perdida_presion,
        "presion_salida": presion_salida
    }
