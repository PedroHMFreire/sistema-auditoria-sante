app.get('/past-counts', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM counts';
    const params = [];
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    console.log('Executando query:', query, 'com parâmetros:', params);
    const result = await pool.query(query, params);
    console.log('Resultado da query:', result.rows);

    // Converter campos JSONB de string para objeto
    const counts = result.rows.map(row => ({
      ...row,
      system_data: row.system_data ? JSON.parse(row.system_data) : [],
      store_data: row.store_data ? JSON.parse(row.store_data) : [],
      summary: row.summary ? JSON.parse(row.summary) : {},
      details: row.details ? JSON.parse(row.details) : [],
    }));

    res.status(200).json(counts);
  } catch (error) {
    console.error('Erro ao listar contagens:', error);
    res.status(500).json({ error: 'Erro ao listar contagens: ' + error.message });
  }
});
