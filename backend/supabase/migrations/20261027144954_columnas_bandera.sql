alter table pedidos
  add column estado_boceto_bandera text
    default 'Pendiente de hablar'
    check (estado_boceto_bandera in ('Pendiente de hablar','Sin respuesta','Diseñada','Confirmada')),
  add column id_disenadora_bandera bigint
    references usuarios(id) on delete set null,
  add column motivo_perdida_bandera text;