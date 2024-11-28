<button className="w-full p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Vérifier la connectivité
            </button>
            <button className="w-full p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Scanner les ports
            </button>

            {/* Statistiques réseau */}
            <div className="mt-4">
              <h3 className="font-medium mb-2">Statistiques</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Latence</span>
                  <span className="font-medium">5ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Vitesse montante</span>
                  <span className="font-medium">50 Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Vitesse descendante</span>
                  <span className="font-medium">100 Mbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Paquets perdus</span>
                  <span className="font-medium">0.1%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration avancée */}
        <div className="col-span-2 bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-6 h-6 text-orange-500" />
            <h2 className="text-lg font-semibold">Configuration Avancée</h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-4">Redirection de ports</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2">Port externe</th>
                    <th className="pb-2">Port interne</th>
                    <th className="pb-2">Protocole</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">80</td>
                    <td className="py-2">8080</td>
                    <td className="py-2">TCP</td>
                    <td className="py-2">
                      <button className="text-red-600 hover:text-red-800">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">443</td>
                    <td className="py-2">8443</td>
                    <td className="py-2">TCP</td>
                    <td className="py-2">
                      <button className="text-red-600 hover:text-red-800">
                        Supprimer
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Ajouter une redirection
              </button>
            </div>

            <div>
              <h3 className="font-medium mb-4">DNS et Proxy</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Serveurs DNS</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    placeholder="8.8.8.8, 8.8.4.4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Proxy HTTP</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    placeholder="http://proxy.example.com:8080"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">DHCP</h3>
                    <p className="text-sm text-gray-500">Attribution automatique des IP</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={true} />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="mt-6 flex justify-end gap-4">
        <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
          Annuler
        </button>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Sauvegarder
        </button>
      </div>
    </div>
  );
};

export default NetworkConfiguration;
