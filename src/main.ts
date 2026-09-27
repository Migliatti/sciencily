import pg from 'pg'
import { migrar } from './db/migrar.ts'
import { criarServidor } from './http/app.ts'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL não definida')
const porta = Number(process.env.PORT ?? 3000)

const pool = new pg.Pool({ connectionString: databaseUrl })
const aplicadas = await migrar(pool)
if (aplicadas.length > 0) console.log(`migrações aplicadas: ${aplicadas.join(', ')}`)

criarServidor(pool).listen(porta, () => console.log(`ouvindo na porta ${porta}`))
