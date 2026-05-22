// mssql is loaded lazily inside each function so a missing native addon
// does not crash the spec file at collection time — tests still run using
// the credentials.json fallback when the DB is unavailable.

const CONNECTION_STRING =
  'Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=HS_UserData;Trusted_Connection=yes;';

export interface LoginCredentials {
  username: string;
  password: string;
}

export async function getLoginCredentials(id = 1): Promise<LoginCredentials> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sql = require('mssql/msnodesqlv8');
  const pool = await sql.connect({ connectionString: CONNECTION_STRING });
  try {
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('SELECT username, plain_password AS password FROM users WHERE id = @id');
    const row = result.recordset[0] as LoginCredentials;
    if (!row) throw new Error(`No user found with id=${id} in HS_UserData.dbo.users`);
    return row;
  } finally {
    await pool.close();
  }
}

export async function getAllLoginCredentials(): Promise<LoginCredentials[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sql = require('mssql/msnodesqlv8');
  const pool = await sql.connect({ connectionString: CONNECTION_STRING });
  try {
    const result = await pool
      .request()
      .query('SELECT username, plain_password AS password FROM users');
    const rows = result.recordset as LoginCredentials[];
    if (rows.length === 0) throw new Error('No users found in HS_UserData.dbo.users');
    return rows;
  } finally {
    await pool.close();
  }
}
