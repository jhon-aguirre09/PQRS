const templates = {
  Peticion: 'Hemos recibido su petición y la estamos revisando. Nuestro equipo validará la información y le comunicará la respuesta por el canal seleccionado.',
  Queja: 'Lamentamos la experiencia que nos describe. Registramos su queja y revisaremos lo ocurrido para informarle las acciones correspondientes.',
  Reclamo: 'Registramos su reclamo y verificaremos los hechos y soportes asociados. Una vez concluya la revisión, le comunicaremos una respuesta de fondo.',
  Sugerencia: 'Gracias por compartir su sugerencia. La remitiremos al área responsable para su evaluación y le informaremos el resultado de la revisión.'
};

function generateDraft(request) {
  const opening = templates[request.request_type] || templates.Peticion;
  const subject = String(request.subject).trim();
  return `${opening}\n\nEn relación con su solicitud "${subject}", le confirmamos que será atendida conforme a los procedimientos y términos aplicables.`;
}

module.exports = { generateDraft };
