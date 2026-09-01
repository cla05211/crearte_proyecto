alter table cuotas add column monto_cubierto numeric not null default 0;

update cuotas
set monto_cubierto = importe
where estado = 'Pagada';

