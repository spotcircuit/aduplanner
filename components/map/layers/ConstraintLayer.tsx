    }

    const mainHouseSizeStr = ExistingStructuresAndFeatures.MainHouseSize || '';
    const sizeMatch = mainHouseSizeStr.match(/(\d+)/);
    const mainHouseSize = sizeMatch ? parseInt(sizeMatch[0]) : 1500; 

    const mainHouseCoords = estimateMainHouseCoordinates(map.getCenter(), mainHouseSize);
    const mainHouseConstraint = createPolygon(mainHouseCoords, 'structure');
    if (mainHouseConstraint) {
      constraints.current.push(mainHouseConstraint);

      const setbackDistances = {
        front: parseInt(SetbackAndBuildableAreaAnalysis.FrontYardSetback || '20'),
        side: parseInt(SetbackAndBuildableAreaAnalysis.SideYardSetback || '5'),
        rear: parseInt(SetbackAndBuildableAreaAnalysis.RearYardSetback || '10')
      };

      const setbackConstraint = createSetbackPolygon(mainHouseCoords, Math.max(...Object.values(setbackDistances)));
      if (setbackConstraint) {
        constraints.current.push(setbackConstraint);
      }
    }

    const frontYardCoords = [
      { lat: map.getCenter().lat() - 0.0004, lng: map.getCenter().lng() - 0.0004 },
      { lat: map.getCenter().lat() - 0.0004, lng: map.getCenter().lng() + 0.0004 },
      { lat: map.getCenter().lat() - 0.0002, lng: map.getCenter().lng() + 0.0004 },
      { lat: map.getCenter().lat() - 0.0002, lng: map.getCenter().lng() - 0.0004 }
    ];
    const frontYardConstraint = createPolygon(frontYardCoords, 'frontYard');
    if (frontYardConstraint) {
      constraints.current.push(frontYardConstraint);
    }

    const totalConstrainedArea = constraints.current.reduce((sum, c) => sum + c.area, 0);
    
    const buildableAreaStr = SetbackAndBuildableAreaAnalysis.BuildableArea || '';
    const buildableAreaMatch = buildableAreaStr.match(/(\d+)/);
    const buildableArea = buildableAreaMatch ? parseInt(buildableAreaMatch[0]) : null;

    console.log('Constraints created:', constraints.current);
    console.log('Total constrained area:', totalConstrainedArea);
    console.log('Buildable area from analysis:', buildableArea);

    onConstraintsReady?.(buildableArea || (totalConstrainedArea * 0.6)); 

  }, [map, visionAnalysis, onConstraintsReady]);

  return null;
};

export default ConstraintLayer;
