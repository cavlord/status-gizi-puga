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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      child_records: {
        Row: {
          alamat: string | null
          bb_lahir: string | null
          bb_tb: string | null
          bb_u: string | null
          berat: string | null
          bulan_pengukuran: string | null
          cara_ukur: string | null
          created_at: string
          desa_kel: string | null
          detail_status: string | null
          id: string
          jk: string | null
          jml_vit_a: string | null
          kab_kota: string | null
          kec: string | null
          kia: string | null
          kpsp: string | null
          lila: string | null
          naik_berat_badan: string | null
          nama: string
          nama_ortu: string | null
          nik: string
          pmt_diterima: string | null
          posyandu: string | null
          prov: string | null
          puskesmas: string | null
          rt: string | null
          rw: string | null
          status_bulan: string | null
          status_desa: string | null
          status_tahun: string | null
          tanggal_pengukuran: string | null
          tb_lahir: string | null
          tb_u: string | null
          tgl_lahir: string | null
          tinggi: string | null
          updated_at: string
          usia_saat_ukur: string | null
          zs_bb_tb: string | null
          zs_bb_u: string | null
          zs_tb_u: string | null
        }
        Insert: {
          alamat?: string | null
          bb_lahir?: string | null
          bb_tb?: string | null
          bb_u?: string | null
          berat?: string | null
          bulan_pengukuran?: string | null
          cara_ukur?: string | null
          created_at?: string
          desa_kel?: string | null
          detail_status?: string | null
          id?: string
          jk?: string | null
          jml_vit_a?: string | null
          kab_kota?: string | null
          kec?: string | null
          kia?: string | null
          kpsp?: string | null
          lila?: string | null
          naik_berat_badan?: string | null
          nama: string
          nama_ortu?: string | null
          nik: string
          pmt_diterima?: string | null
          posyandu?: string | null
          prov?: string | null
          puskesmas?: string | null
          rt?: string | null
          rw?: string | null
          status_bulan?: string | null
          status_desa?: string | null
          status_tahun?: string | null
          tanggal_pengukuran?: string | null
          tb_lahir?: string | null
          tb_u?: string | null
          tgl_lahir?: string | null
          tinggi?: string | null
          updated_at?: string
          usia_saat_ukur?: string | null
          zs_bb_tb?: string | null
          zs_bb_u?: string | null
          zs_tb_u?: string | null
        }
        Update: {
          alamat?: string | null
          bb_lahir?: string | null
          bb_tb?: string | null
          bb_u?: string | null
          berat?: string | null
          bulan_pengukuran?: string | null
          cara_ukur?: string | null
          created_at?: string
          desa_kel?: string | null
          detail_status?: string | null
          id?: string
          jk?: string | null
          jml_vit_a?: string | null
          kab_kota?: string | null
          kec?: string | null
          kia?: string | null
          kpsp?: string | null
          lila?: string | null
          naik_berat_badan?: string | null
          nama?: string
          nama_ortu?: string | null
          nik?: string
          pmt_diterima?: string | null
          posyandu?: string | null
          prov?: string | null
          puskesmas?: string | null
          rt?: string | null
          rw?: string | null
          status_bulan?: string | null
          status_desa?: string | null
          status_tahun?: string | null
          tanggal_pengukuran?: string | null
          tb_lahir?: string | null
          tb_u?: string | null
          tgl_lahir?: string | null
          tinggi?: string | null
          updated_at?: string
          usia_saat_ukur?: string | null
          zs_bb_tb?: string | null
          zs_bb_u?: string | null
          zs_tb_u?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          otp: string | null
          otp_expiry: string | null
          password_hash: string
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          otp?: string | null
          otp_expiry?: string | null
          password_hash: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          otp?: string | null
          otp_expiry?: string | null
          password_hash?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
