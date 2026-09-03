export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agregados: {
        Row: {
          agregado: string | null
          id: number
          individual: boolean | null
          precio: number | null
        }
        Insert: {
          agregado?: string | null
          id?: number
          individual?: boolean | null
          precio?: number | null
        }
        Update: {
          agregado?: string | null
          id?: number
          individual?: boolean | null
          precio?: number | null
        }
        Relationships: []
      }
      agregados_globales_pedido: {
        Row: {
          id: number
          id_agregado: number | null
          id_pedido: number | null
        }
        Insert: {
          id?: number
          id_agregado?: number | null
          id_pedido?: number | null
        }
        Update: {
          id?: number
          id_agregado?: number | null
          id_pedido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agregados_globales_pedido_id_agregado_fkey"
            columns: ["id_agregado"]
            isOneToOne: false
            referencedRelation: "agregados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agregados_globales_pedido_id_pedido_fkey"
            columns: ["id_pedido"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      alumnos_responsables: {
        Row: {
          apellido: string | null
          id: number
          id_grupo: number
          nombre: string | null
          telefono: string | null
        }
        Insert: {
          apellido?: string | null
          id?: number
          id_grupo: number
          nombre?: string | null
          telefono?: string | null
        }
        Update: {
          apellido?: string | null
          id?: number
          id_grupo?: number
          nombre?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alumnos_responsables_id_grupo_fkey"
            columns: ["id_grupo"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          created_at: string
          dato_anterior: string | null
          dato_nuevo: string | null
          id: number
          registro_id_modificado: number | null
          tabla: string
          usuario: number
        }
        Insert: {
          accion: string
          created_at?: string
          dato_anterior?: string | null
          dato_nuevo?: string | null
          id?: number
          registro_id_modificado?: number | null
          tabla: string
          usuario: number
        }
        Update: {
          accion?: string
          created_at?: string
          dato_anterior?: string | null
          dato_nuevo?: string | null
          id?: number
          registro_id_modificado?: number | null
          tabla?: string
          usuario?: number
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_usuario_fkey"
            columns: ["usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficios: {
        Row: {
          beneficio: string | null
          id: number
        }
        Insert: {
          beneficio?: string | null
          id?: number
        }
        Update: {
          beneficio?: string | null
          id?: number
        }
        Relationships: []
      }
      colegios: {
        Row: {
          id: number
          localidad: string
          nombre: string
          provincia: string
        }
        Insert: {
          id?: number
          localidad: string
          nombre: string
          provincia: string
        }
        Update: {
          id?: number
          localidad?: string
          nombre?: string
          provincia?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          documento: number | null
          fecha_firma: string | null
          fecha_generacion: string | null
          firmado: boolean | null
          grupo: number | null
          id: number
        }
        Insert: {
          documento?: number | null
          fecha_firma?: string | null
          fecha_generacion?: string | null
          firmado?: boolean | null
          grupo?: number | null
          id?: number
        }
        Update: {
          documento?: number | null
          fecha_firma?: string | null
          fecha_generacion?: string | null
          firmado?: boolean | null
          grupo?: number | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_documento_fkey"
            columns: ["documento"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_grupo_fkey"
            columns: ["grupo"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      cuotas: {
        Row: {
          estado: string | null
          fecha_pago: string | null
          fecha_vencimiento: string | null
          id: number
          id_pedido: number
          importe: number | null
          monto_cubierto: number
          numero: number | null
        }
        Insert: {
          estado?: string | null
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: number
          id_pedido: number
          importe?: number | null
          monto_cubierto?: number
          numero?: number | null
        }
        Update: {
          estado?: string | null
          fecha_pago?: string | null
          fecha_vencimiento?: string | null
          id?: number
          id_pedido?: number
          importe?: number | null
          monto_cubierto?: number
          numero?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cuotas_pedido_fkey"
            columns: ["id_pedido"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          archivo_url: string | null
          created_at: string | null
          id: number
          id_grupo: number
          tipo: string | null
        }
        Insert: {
          archivo_url?: string | null
          created_at?: string | null
          id?: number
          id_grupo: number
          tipo?: string | null
        }
        Update: {
          archivo_url?: string | null
          created_at?: string | null
          id?: number
          id_grupo?: number
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_grupo_fkey"
            columns: ["id_grupo"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos: {
        Row: {
          cantidad_egresados: number | null
          created_at: string | null
          id: number
          id_colegio: number
          nivel: string | null
          orientacion: string | null
          promo: number | null
          turno: string | null
        }
        Insert: {
          cantidad_egresados?: number | null
          created_at?: string | null
          id?: number
          id_colegio: number
          nivel?: string | null
          orientacion?: string | null
          promo?: number | null
          turno?: string | null
        }
        Update: {
          cantidad_egresados?: number | null
          created_at?: string | null
          id?: number
          id_colegio?: number
          nivel?: string | null
          orientacion?: string | null
          promo?: number | null
          turno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_colegio_fkey"
            columns: ["id_colegio"]
            isOneToOne: false
            referencedRelation: "colegios"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_caja: {
        Row: {
          categoria: string | null
          descripcion: string | null
          fecha: string
          id: number
          monto: number | null
          tipo: string | null
          usuario: number | null
        }
        Insert: {
          categoria?: string | null
          descripcion?: string | null
          fecha: string
          id?: number
          monto?: number | null
          tipo?: string | null
          usuario?: number | null
        }
        Update: {
          categoria?: string | null
          descripcion?: string | null
          fecha?: string
          id?: number
          monto?: number | null
          tipo?: string | null
          usuario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_caja_usuario_fkey"
            columns: ["usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      padres_responsables: {
        Row: {
          apellido: string | null
          dni: string | null
          id: number
          id_grupo: number
          mail: string | null
          nombre: string | null
          telefono: string | null
        }
        Insert: {
          apellido?: string | null
          dni?: string | null
          id?: number
          id_grupo: number
          mail?: string | null
          nombre?: string | null
          telefono?: string | null
        }
        Update: {
          apellido?: string | null
          dni?: string | null
          id?: number
          id_grupo?: number
          mail?: string | null
          nombre?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "padres_responsables_id_grupo_fkey"
            columns: ["id_grupo"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          aprobado: boolean | null
          banco: string | null
          detalle_cuotas: Json | null
          entidad_pago: string | null
          enviado_banco: boolean | null
          fecha: string | null
          id: number
          id_documento: number | null
          id_pedido: number | null
          monto: number | null
          motivo: string | null
          nro_transferencia: string | null
        }
        Insert: {
          aprobado?: boolean | null
          banco?: string | null
          detalle_cuotas?: Json | null
          entidad_pago?: string | null
          enviado_banco?: boolean | null
          fecha?: string | null
          id?: number
          id_documento?: number | null
          id_pedido?: number | null
          monto?: number | null
          motivo?: string | null
          nro_transferencia?: string | null
        }
        Update: {
          aprobado?: boolean | null
          banco?: string | null
          detalle_cuotas?: Json | null
          entidad_pago?: string | null
          enviado_banco?: boolean | null
          fecha?: string | null
          id?: number
          id_documento?: number | null
          id_pedido?: number | null
          monto?: number | null
          motivo?: string | null
          nro_transferencia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_id_documento_fkey"
            columns: ["id_documento"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_pedido_fkey"
            columns: ["id_pedido"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cantidad_hermanos: number | null
          colores: string | null
          envio_gratis: boolean | null
          estado_boceto: string | null
          estado_general: string | null
          estado_talles: string | null
          fecha_aprobacion_boceto: string | null
          fecha_aprobacion_talles: string | null
          id: number
          id_disenadora: number | null
          id_grupo: number
          id_vendedora: number | null
          molderias: string | null
          observaciones: string | null
          porcentaje_descuento_hermanos: number | null
          talles: string | null
        }
        Insert: {
          cantidad_hermanos?: number | null
          colores?: string | null
          envio_gratis?: boolean | null
          estado_boceto?: string | null
          estado_general?: string | null
          estado_talles?: string | null
          fecha_aprobacion_boceto?: string | null
          fecha_aprobacion_talles?: string | null
          id?: number
          id_disenadora?: number | null
          id_grupo: number
          id_vendedora?: number | null
          molderias?: string | null
          observaciones?: string | null
          porcentaje_descuento_hermanos?: number | null
          talles?: string | null
        }
        Update: {
          cantidad_hermanos?: number | null
          colores?: string | null
          envio_gratis?: boolean | null
          estado_boceto?: string | null
          estado_general?: string | null
          estado_talles?: string | null
          fecha_aprobacion_boceto?: string | null
          fecha_aprobacion_talles?: string | null
          id?: number
          id_disenadora?: number | null
          id_grupo?: number
          id_vendedora?: number | null
          molderias?: string | null
          observaciones?: string | null
          porcentaje_descuento_hermanos?: number | null
          talles?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_grupo_fkey"
            columns: ["id_grupo"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_id_vendedora_fkey"
            columns: ["id_vendedora"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      permisos: {
        Row: {
          descripcion: string | null
          id: number
          nombre: string | null
        }
        Insert: {
          descripcion?: string | null
          id?: number
          nombre?: string | null
        }
        Update: {
          descripcion?: string | null
          id?: number
          nombre?: string | null
        }
        Relationships: []
      }
      precios_productos: {
        Row: {
          beneficio: string | null
          cantidad_desde: number
          cantidad_hasta: number
          cuotas: number
          id: number
          id_producto: number
          valor_cuota: number
          valor_senia: number
        }
        Insert: {
          beneficio?: string | null
          cantidad_desde: number
          cantidad_hasta: number
          cuotas: number
          id?: number
          id_producto: number
          valor_cuota: number
          valor_senia: number
        }
        Update: {
          beneficio?: string | null
          cantidad_desde?: number
          cantidad_hasta?: number
          cuotas?: number
          id?: number
          id_producto?: number
          valor_cuota?: number
          valor_senia?: number
        }
        Relationships: [
          {
            foreignKeyName: "precios_productos_id_producto_fkey"
            columns: ["id_producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      prendas_pedido: {
        Row: {
          id: number
          inscripcion: string | null
          pedido: number
          producto: number | null
          talle: string | null
        }
        Insert: {
          id?: number
          inscripcion?: string | null
          pedido: number
          producto?: number | null
          talle?: string | null
        }
        Update: {
          id?: number
          inscripcion?: string | null
          pedido?: number
          producto?: number | null
          talle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prendas_pedido_pedido_fkey"
            columns: ["pedido"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prendas_pedido_producto_fkey"
            columns: ["producto"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          descripcion: string
          id: number
          nombre: string
        }
        Insert: {
          descripcion: string
          id?: number
          nombre: string
        }
        Update: {
          descripcion?: string
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      productos_pedidos: {
        Row: {
          beneficio: string | null
          cantidad: number
          descripcion: string | null
          id: number
          id_pedido: number
          id_producto_original: number
          valor_cuota: number
          valor_senia: number
        }
        Insert: {
          beneficio?: string | null
          cantidad: number
          descripcion?: string | null
          id?: number
          id_pedido: number
          id_producto_original: number
          valor_cuota: number
          valor_senia: number
        }
        Update: {
          beneficio?: string | null
          cantidad?: number
          descripcion?: string | null
          id?: number
          id_pedido?: number
          id_producto_original?: number
          valor_cuota?: number
          valor_senia?: number
        }
        Relationships: [
          {
            foreignKeyName: "productos_pedidos_id_pedido_fkey"
            columns: ["id_pedido"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_pedidos_id_producto_original_fkey"
            columns: ["id_producto_original"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: number
          nombre_rol: string
          rol: number
        }
        Insert: {
          id?: number
          nombre_rol: string
          rol: number
        }
        Update: {
          id?: number
          nombre_rol?: string
          rol?: number
        }
        Relationships: []
      }
      roles_permisos: {
        Row: {
          id: number
          permiso_id: number | null
          rol_nro: number | null
        }
        Insert: {
          id?: number
          permiso_id?: number | null
          rol_nro?: number | null
        }
        Update: {
          id?: number
          permiso_id?: number | null
          rol_nro?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_permisos_permiso_id_fkey"
            columns: ["permiso_id"]
            isOneToOne: false
            referencedRelation: "permisos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_permisos_rol_nro_fkey"
            columns: ["rol_nro"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["rol"]
          },
        ]
      }
      usuarios: {
        Row: {
          apellido: string | null
          aprobado: boolean
          id: number
          id_auth: string
          nombre: string | null
          rol: number | null
        }
        Insert: {
          apellido?: string | null
          aprobado?: boolean
          id?: number
          id_auth: string
          nombre?: string | null
          rol?: number | null
        }
        Update: {
          apellido?: string | null
          aprobado?: boolean
          id?: number
          id_auth?: string
          nombre?: string | null
          rol?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_rol_fkey"
            columns: ["rol"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["rol"]
          },
        ]
      }
    }
    Views: {
      vista_caja: {
        Row: {
          categoria: string | null
          descripcion: string | null
          fecha: string | null
          id: string | null
          id_pedido: number | null
          monto: number | null
          origen: string | null
          tipo: string | null
          usuario: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      crear_pedido_completo: { Args: { payload: Json }; Returns: number }
      modificar_plan_pedido: { Args: { payload: Json }; Returns: Json }
      registrar_pago_completo: { Args: { p_pago: Json }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
