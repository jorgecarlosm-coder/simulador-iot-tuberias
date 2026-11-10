
import math


def validar_parametros(parametros):
    """
    Comprueba que existan los parametros fisicos necesarios.
    """

    requeridos = [
        "longitud",
        "diametro",
        "caudal",
        "presion_entrada",
        "rho",
        "mu",
        "rugosidad",
        "coeficiente_U",
        "temperatura_entrada",
        "temperatura_ambiente",
        "cp"
    ]

    for nombre in requeridos:
        if nombre not in parametros:
            raise ValueError(
                f"Falta el parametro: {nombre}"
            )

    if parametros["longitud"] <= 0:
        raise ValueError("La longitud debe ser positiva.")

    if parametros["diametro"] <= 0:
        raise ValueError("El diametro debe ser positivo.")

    if parametros["caudal"] <= 0:
        raise ValueError("El caudal debe ser positivo.")

    if parametros["rho"] <= 0 or parametros["mu"] <= 0:
        raise ValueError("Densidad y viscosidad deben ser positivas.")

    if parametros["cp"] <= 0:
        raise ValueError("El calor especifico debe ser positivo.")

    if parametros["coeficiente_U"] < 0:
        raise ValueError("El coeficiente U no puede ser negativo.")


def modelo_fallas(
    tipo_falla,
    parametros,
    area_fuga=0.00001,
    coeficiente_descarga=0.62,
    diferencia_presion_fuga=100000,
    ubicacion_fuga=0.5,
    reduccion_area=0.30,
    factor_incremento_U=3.0,
    incremento_temperatura=15.0
):
    """
    Representa cuatro tipos de fallas en una tuberia:

    - normal
    - fuga
    - obstruccion
    - perdida_aislamiento
    - sobrecalentamiento

    Los parametros de entrada se mantienen sin modificar.
    Se devuelve una copia con los cambios correspondientes.

    Las modificaciones representan condiciones equivalentes
    de operacion. No sustituyen un modelo hidraulico
    distribuido por segmentos.
    """

    validar_parametros(parametros)

    modificados = parametros.copy()

    detalles = {
        "tipo_falla": tipo_falla,
        "falla_activa": tipo_falla != "normal"
    }

    # 1. Condicion normal
    if tipo_falla == "normal":

        detalles["descripcion"] = (
            "Tuberia funcionando sin fallas."
        )

    # 2. Fuga hidraulica
    elif tipo_falla == "fuga":

        if area_fuga <= 0:
            raise ValueError("El area de fuga debe ser positiva.")

        if not 0 < coeficiente_descarga <= 1:
            raise ValueError(
                "El coeficiente de descarga debe estar entre 0 y 1."
            )

        if diferencia_presion_fuga <= 0:
            raise ValueError(
                "La diferencia de presion debe ser positiva."
            )

        if not 0 <= ubicacion_fuga <= 1:
            raise ValueError(
                "La ubicacion debe estar entre 0 y 1."
            )

        # Ecuacion de descarga por un orificio
        caudal_fuga = (
            coeficiente_descarga
            * area_fuga
            * math.sqrt(
                2 * diferencia_presion_fuga
                / parametros["rho"]
            )
        )

        caudal_salida = parametros["caudal"] - caudal_fuga

        if caudal_salida <= 0:
            raise ValueError(
                "La fuga supera o iguala el caudal disponible."
            )

        modificados["caudal"] = caudal_salida

        detalles.update({
            "descripcion": "Fuga de fluido por un orificio.",
            "caudal_fuga": caudal_fuga,
            "caudal_salida": caudal_salida,
            "ubicacion_fuga": ubicacion_fuga,
            "area_fuga": area_fuga
        })

    # 3. Obstruccion
    elif tipo_falla == "obstruccion":

        if not 0 < reduccion_area < 0.95:
            raise ValueError(
                "La reduccion de area debe estar entre 0 y 0.95."
            )

        diametro_original = parametros["diametro"]

        # Aefectiva = Aoriginal * (1 - reduccion)
        diametro_efectivo = (
            diametro_original
            * math.sqrt(1 - reduccion_area)
        )

        modificados["diametro"] = diametro_efectivo

        detalles.update({
            "descripcion": "Reduccion del area de circulacion.",
            "diametro_original": diametro_original,
            "diametro_efectivo": diametro_efectivo,
            "reduccion_area": reduccion_area
        })

    # 4. Perdida de aislamiento
    elif tipo_falla == "perdida_aislamiento":

        if factor_incremento_U <= 1:
            raise ValueError(
                "El factor de incremento de U debe ser mayor que 1."
            )

        U_original = parametros["coeficiente_U"]

        U_nuevo = U_original * factor_incremento_U

        modificados["coeficiente_U"] = U_nuevo

        detalles.update({
            "descripcion": (
                "Aumento de transferencia de calor al ambiente."
            ),
            "U_original": U_original,
            "U_nuevo": U_nuevo,
            "factor_incremento_U": factor_incremento_U
        })

    # 5. Sobrecalentamiento
    elif tipo_falla == "sobrecalentamiento":

        if incremento_temperatura <= 0:
            raise ValueError(
                "El incremento de temperatura debe ser positivo."
            )

        temperatura_original = parametros["temperatura_entrada"]

        temperatura_nueva = (
            temperatura_original + incremento_temperatura
        )

        modificados["temperatura_entrada"] = temperatura_nueva

        detalles.update({
            "descripcion": (
                "Incremento anormal de la temperatura de entrada."
            ),
            "temperatura_original": temperatura_original,
            "temperatura_nueva": temperatura_nueva,
            "incremento_temperatura": incremento_temperatura
        })

    else:
        raise ValueError(
            "Falla no reconocida. Utilice: normal, fuga, "
            "obstruccion, perdida_aislamiento o sobrecalentamiento."
        )

    return {
        "parametros_modificados": modificados,
        "detalles": detalles
    }

