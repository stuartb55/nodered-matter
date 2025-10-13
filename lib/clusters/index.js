/**
 * Cluster Adapter Factory
 * Creates appropriate cluster adapters based on cluster type
 */

const BaseClusterAdapter = require('./base-adapter');
const BooleanStateAdapter = require('./boolean-state-adapter');
const OnOffAdapter = require('./on-off-adapter');
const LevelControlAdapter = require('./level-control-adapter');

class ClusterAdapterFactory {
    static createAdapter(cluster, options = {}) {
        const clusterName = cluster.constructor.name;
        
        switch (clusterName) {
            case 'BooleanStateCluster':
                return new BooleanStateAdapter(cluster, options);
                
            case 'OnOffCluster':
                return new OnOffAdapter(cluster, options);
                
            case 'LevelControlCluster':
                return new LevelControlAdapter(cluster, options);
                
            default:
                // Return base adapter for unknown clusters
                return new BaseClusterAdapter(cluster, options);
        }
    }

    static getSupportedClusters() {
        return [
            'BooleanStateCluster',
            'OnOffCluster', 
            'LevelControlCluster'
        ];
    }

    static isClusterSupported(clusterName) {
        return this.getSupportedClusters().includes(clusterName);
    }

    static getClusterInfo(clusterName) {
        const clusterInfo = {
            'BooleanStateCluster': {
                name: 'Boolean State',
                description: 'Contact sensors, door/window sensors',
                deviceTypes: ['contact', 'sensor'],
                adapter: BooleanStateAdapter
            },
            'OnOffCluster': {
                name: 'On/Off',
                description: 'Switches, lights, outlets',
                deviceTypes: ['switch', 'light', 'outlet'],
                adapter: OnOffAdapter
            },
            'LevelControlCluster': {
                name: 'Level Control',
                description: 'Dimmers, volume controls',
                deviceTypes: ['dimmer', 'volume'],
                adapter: LevelControlAdapter
            }
        };

        return clusterInfo[clusterName] || {
            name: clusterName,
            description: 'Unknown cluster type',
            deviceTypes: ['unknown'],
            adapter: BaseClusterAdapter
        };
    }
}

module.exports = ClusterAdapterFactory;
