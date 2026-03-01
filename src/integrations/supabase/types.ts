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
      anak: {
        Row: {
          alamat: string | null
          bb_lahir: number | null
          created_at: string | null
          desa_kelurahan: string | null
          jenis_kelamin: string | null
          kab_kota: string | null
          kecamatan: string | null
          nama: string
          nama_ortu: string | null
          nik: string
          posyandu: string | null
          provinsi: string | null
          puskesmas: string | null
          rt: string | null
          rw: string | null
          status: string | null
          tb_lahir: number | null
          tgl_lahir: string | null
        }
        Insert: {
          alamat?: string | null
          bb_lahir?: number | null
          created_at?: string | null
          desa_kelurahan?: string | null
          jenis_kelamin?: string | null
          kab_kota?: string | null
          kecamatan?: string | null
          nama: string
          nama_ortu?: string | null
          nik: string
          posyandu?: string | null
          provinsi?: string | null
          puskesmas?: string | null
          rt?: string | null
          rw?: string | null
          status?: string | null
          tb_lahir?: number | null
          tgl_lahir?: string | null
        }
        Update: {
          alamat?: string | null
          bb_lahir?: number | null
          created_at?: string | null
          desa_kelurahan?: string | null
          jenis_kelamin?: string | null
          kab_kota?: string | null
          kecamatan?: string | null
          nama?: string
          nama_ortu?: string | null
          nik?: string
          posyandu?: string | null
          provinsi?: string | null
          puskesmas?: string | null
          rt?: string | null
          rw?: string | null
          status?: string | null
          tb_lahir?: number | null
          tgl_lahir?: string | null
        }
        Relationships: []
      }
      child_records: {
        Row: {
          berat_badan: number | null
          bulan_pengukuran: string | null
          cara_ukur: string | null
          created_at: string | null
          detail: string | null
          id: number
          jml_vit_a: number | null
          kia: string | null
          kpsp: string | null
          lila: number | null
          naik_bb: string | null
          nik: string | null
          pmt_diterima_kg: number | null
          status_bbtb: string | null
          status_bbu: string | null
          status_desa: string | null
          status_tbu: string | null
          tgl_pengukuran: string | null
          tinggi_badan: number | null
          usia_saat_ukur: string | null
          zscore_bbtb: number | null
          zscore_bbu: number | null
          zscore_tbu: number | null
        }
        Insert: {
          berat_badan?: number | null
          bulan_pengukuran?: string | null
          cara_ukur?: string | null
          created_at?: string | null
          detail?: string | null
          id?: number
          jml_vit_a?: number | null
          kia?: string | null
          kpsp?: string | null
          lila?: number | null
          naik_bb?: string | null
          nik?: string | null
          pmt_diterima_kg?: number | null
          status_bbtb?: string | null
          status_bbu?: string | null
          status_desa?: string | null
          status_tbu?: string | null
          tgl_pengukuran?: string | null
          tinggi_badan?: number | null
          usia_saat_ukur?: string | null
          zscore_bbtb?: number | null
          zscore_bbu?: number | null
          zscore_tbu?: number | null
        }
        Update: {
          berat_badan?: number | null
          bulan_pengukuran?: string | null
          cara_ukur?: string | null
          created_at?: string | null
          detail?: string | null
          id?: number
          jml_vit_a?: number | null
          kia?: string | null
          kpsp?: string | null
          lila?: number | null
          naik_bb?: string | null
          nik?: string | null
          pmt_diterima_kg?: number | null
          status_bbtb?: string | null
          status_bbu?: string | null
          status_desa?: string | null
          status_tbu?: string | null
          tgl_pengukuran?: string | null
          tinggi_badan?: number | null
          usia_saat_ukur?: string | null
          zscore_bbtb?: number | null
          zscore_bbu?: number | null
          zscore_tbu?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pengukuran_gizi_nik_fkey"
            columns: ["nik"]
            isOneToOne: false
            referencedRelation: "anak"
            referencedColumns: ["nik"]
          },
        ]
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
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_public"
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
      users_public: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
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
