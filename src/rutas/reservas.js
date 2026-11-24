const express = require("express");
const {
  prepararAreaReservas,
  validarDatosReserva,
} = require("../middleware/reservas");

function crearRouterReservas(controladorReservas) {
  const router = express.Router();
  router.use(prepararAreaReservas);
  router.get("/", controladorReservas.listar);
  router.get("/nueva", controladorReservas.mostrarFormulario);
  router.get("/:id/editar", controladorReservas.mostrarEdicion);
  router.post("/:id/editar", controladorReservas.guardarEdicion);
  router.get("/:id", controladorReservas.mostrarDetalle);
  router.post("/", validarDatosReserva, controladorReservas.crear);
  router.get("/:id/estado", controladorReservas.mostrarCambioParcial);
  router.post("/:id/estado", controladorReservas.guardarCambioParcial);
  router.get("/:id/eliminar", controladorReservas.mostrarEliminacion);
  router.post("/:id/eliminar", controladorReservas.eliminarWeb);
  return router;
}
module.exports = { crearRouterReservas };
