const { URLSearchParams } = require("node:url");
const { leerCriterios } = require("../servicios/reservas-criterios");
function crearControladorReservas(servicio) {
  async function listar(req, res) {
    const criterios = leerCriterios(req.query);
    const resultado = await servicio.buscar(criterios);
    function enlacePagina(pagina) {
      const parametros = new URLSearchParams({
        q: criterios.q,
        sala: criterios.sala,
        orden: criterios.orden,
        limite: String(criterios.limite),
        pagina: String(pagina),
      });
      return `/reservas?${parametros.toString()}`;
    }
    res.render("reservas/lista", {
      titulo: "Reservas",
      reservas: resultado.datos,
      criterios,
      resultado,
      enlacePagina,
    });
  }
    async function consultarApi(req, res) {
      const criterios = leerCriterios(req.query);
      const resultado = await servicio.buscar(criterios);
      res.json(resultado);
    }

    function mostrarFormulario(req, res) {
      res.render("reservas/nueva", {
        titulo: "Nueva reserva",
        error: null,
        valores: {},
      });
    }

    async function mostrarDetalle(req, res) {
      const reserva = await servicio.obtenerPorId(req.params.id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          titulo: "Reserva no encontrada",
          mensaje: "No existe una reserva con ese identificador.",
        });
      }
      res.render("reservas/detalle", { titulo: reserva.sala, reserva });
    }

    async function crear(req, res) {
      await servicio.crear(req.reservaValidada);
      res.redirect("/reservas");
    }

    async function estado(req, res) {
      const cantidad = await servicio.contar();
      res.status(200).json({
        servicio: "Activo",
        reservas: cantidad,
        idSolicitud: res.locals.idSolicitud,
      });
    }

    async function mostrarEdicion(req, res) {
      const reserva = await servicio.obtenerPorId(req.params.id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          titulo: "Reserva no encontrada",
          mensaje: "No existe la Reserva que quiere editar.",
        });
      }
      res.render("reservas/editar", {
        titulo: "Editar Reserva",
        error: null,
        id: reserva.id,
        valores: { ...reserva, estado: String(reserva.estado) },
      });
    }

    async function guardarEdicion(req, res) {
      const reserva = await servicio.obtenerPorId(req.params.id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          titulo: "Reserva no encontrada",
          mensaje: "La Reserva ya no existe. No se guardaron cambios.",
        });
      }
      const datos = req.body ?? {};
      const valores = {
        estudiante: typeof datos.estudiante === "string" ? datos.estudiante : "",
        email: typeof datos.email === "string" ? datos.email : "",
        fecha: typeof datos.fecha === "string" ? datos.fecha : "",
        sala: typeof datos.sala === "string" ? datos.sala : "",
        turno: typeof datos.turno === "string" ? datos.turno : "",
        personas: typeof datos.personas === "string" ? datos.personas : "",
        estado: typeof datos.estado === "string" ? datos.estado : "",
      };
      const permitidos = [
        "estudiante",
        "email",
        "sala",
        "fecha",
        "turno",
        "personas",
        "estado",
      ];
      let hayCamposExtra = false;
      for (const campo of Object.keys(datos)) {
        if (!permitidos.includes(campo)) hayCamposExtra = true;
      }

      const salasDisponibles = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
      const turnosDisponibles = ["Mañana", "Tarde", "Noche"];

      const personas =
        valores.personas.trim() === "" ? NaN : Number(valores.personas);
      const estadoValido =
        valores.estado === "pendiente" || valores.estado === "confirmada";
      if (
        hayCamposExtra ||
        !valores.estudiante.trim() ||
        !valores.email.includes("@") ||
        !valores.fecha.trim() ||
        !salasDisponibles.includes(valores.sala.trim()) ||
        !turnosDisponibles.includes(valores.turno.trim()) ||
        !Number.isInteger(personas) ||
        personas < 1 ||
        personas > 6 ||
        !estadoValido
      ) {
        return res.status(400).render("reservas/editar", {
          titulo: "Editar Reserva",
          error:
            "Completá los textos, Personas al menos 1, Estado, Sala y Turno.",
          id: reserva.id,
          valores,
        });
      }
      res.locals.formularioEdicion = { id: reserva.id, valores };
      const reemplazo = {
        estudiante: valores.estudiante.trim(),
        email: valores.email.trim(),
        fecha: valores.fecha.trim(),
        sala: valores.sala.trim(),
        turno: valores.turno.trim(),
        personas,
        estado: valores.estado.trim(),
      };
      const actualizado = await servicio.reemplazar(reserva.id, reemplazo);
      if (!actualizado) {
        return res.status(404).render("no-encontrado", {
          titulo: "Reserva no encontrada",
          mensaje: "La reserva ya no existe. No se guardaron cambios.",
        });
      }
      res.redirect(303, `/reservas/${actualizado.id}`);
    }

    async function mostrarCambioParcial(req, res) {
      const reserva = await servicio.obtenerPorId(req.params.id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          titulo: "Recurso no encontrado",
          mensaje: "No existe el registro solicitado. No se guardaron cambios.",
        });
      }
      res.render("reservas/estado", {
        titulo: "Cambiar Estado Reserva",
        error: null,
        id: reserva.id,
        valores: { estado: reserva.estado },
      });
    }
    async function guardarCambioParcial(req, res) {
      const reserva = await servicio.obtenerPorId(req.params.id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          titulo: "Recurso no encontrado",
          mensaje: "No existe el registro solicitado. No se guardaron cambios.",
        });
      }
      const datos = req.body ?? {};
      const valores = {
        estado: typeof datos.estado === "string" ? datos.estado : "",
      };
      const campoValido =
        valores.estado === "pendiente" || valores.estado === "confirmada";
      if (Object.keys(datos).length !== 1 || !campoValido) {
        return res.status(400).render("reservas/estado", {
          titulo: "Cambiar estado reserva",
          error: "Enviá únicamente estado con una de las opciones indicadas.",
          id: reserva.id,
          valores,
        });
      }
      res.locals.formularioParcial = { id: reserva.id, valores };
      const cambios = { estado: valores.estado };
      const actualizado = await servicio.actualizar(reserva.id, cambios);
      if (!actualizado) {
        return res.status(404).render("no-encontrado", {
          titulo: "Recurso no encontrado",
          mensaje: "No existe el registro solicitado. No se guardaron cambios.",
        });
      }
      res.redirect(303, `/reservas/${actualizado.id}`);
    }

    async function mostrarEliminacion(req, res) {
      const reserva = await servicio.obtenerPorId(req.params.id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          titulo: "Recurso no encontrado",
          mensaje: "No existe el registro solicitado. No se guardaron cambios.",
        });
      }
      res.render("reservas/eliminar", {
        titulo: "Confirmar eliminación",
        error: null,
        reserva,
      });
    }

    async function eliminarWeb(req, res) {
      const reserva = await servicio.obtenerPorId(req.params.id);
      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          titulo: "Recurso no encontrado",
          mensaje: "No existe el registro solicitado. No se guardaron cambios.",
        });
      }
      const datos = req.body ?? {};
      if (Object.keys(datos).length !== 1 || datos.confirmar !== "si") {
        return res.status(400).render("reservas/eliminar", {
          titulo: "Confirmar eliminación",
          error: "La eliminación requiere confirmar desde este formulario.",
          reserva,
        });
      }
      const eliminado = await servicio.eliminar(reserva.id);
      if (!eliminado) {
        return res.status(404).render("no-encontrado", {
          titulo: "Recurso no encontrado",
          mensaje: "No existe el registro solicitado. No se guardaron cambios.",
        });
      }
      res.redirect(303, "/reservas");
    }

    async function listarApi(req, res) {
      const permitidos = ["sala", "orden"];
      for (const campo of Object.keys(req.query)) {
        if (!permitidos.includes(campo)) {
          return res.status(400).json({ error: "Parámetro no permitido." });
        }
      }
      const sala = req.query.sala;
      if (sala !== undefined) {
        if (typeof sala !== "string" || sala.trim() === "") {
          return res
            .status(400)
            .json({ error: "El texto de sala debe tener contenido." });
        }
      }

      let orden = "estudiante";
      if (req.query.orden !== undefined) {
        orden = req.query.orden;
        if (
          orden !== "estudiante" &&
          orden !== "personas-asc" &&
          orden !== "personas-desc"
        ) {
          return res.status(400).json({ error: "Orden no permitido." });
        }
      }

      const resultado = await servicio.consultar(sala, orden);
      res.json(resultado);
    }

    async function obtenerApi(req, res) {
      const reserva = await servicio.obtenerPorId(req.params.id);
      if (!reserva) {
        return res.status(404).json({ error: "Reserva no encontrada." });
      }
      res.json(reserva);
    }

    async function crearApi(req, res) {
      const reserva = await servicio.crear(req.reservaValidada);
      res.location(`/api/reservas/${reserva.id}`).status(201).json(reserva);
    }

    async function eliminarApi(req, res) {
      const eliminado = await servicio.eliminar(req.params.id);
      if (!eliminado) {
        return res.status(404).json({ error: "Recurso no encontrado." });
      }
      res.status(204).end();
    }

    async function reemplazarApi(req, res) {
      const reserva = await servicio.reemplazar(
        req.params.id,
        req.cambiosValidos,
      );
      if (!reserva) {
        return res.status(404).json({ error: "Recurso no encontrado." });
      }
      res.json(reserva);
    }

    async function actualizarApi(req, res) {
      const reserva = await servicio.actualizar(
        req.params.id,
        req.cambiosValidos,
      );
      if (!reserva) {
        return res.status(404).json({ error: "Recurso no encontrado." });
      }
      res.json(reserva);
    }
    return {
      listar,
      consultarApi,
      mostrarFormulario,
      mostrarDetalle,
      crear,
      estado,
      mostrarEdicion,
      guardarEdicion,
      mostrarCambioParcial,
      guardarCambioParcial,
      mostrarEliminacion,
      eliminarWeb,
      listarApi,
      obtenerApi,
      crearApi,
      eliminarApi,
      reemplazarApi,
      actualizarApi,
    };
  }
  module.exports = { crearControladorReservas };
