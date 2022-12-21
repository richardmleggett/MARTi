/*
 * Author: Richard M. Leggett
 * © Copyright 2021-22 Earlham Institute
 */
package uk.ac.earlham.marti.amr;

/**
 *
 * @author leggettr
 */
public class CARDAccession {
    private String name = "";
    private String description = "";
    private String geneFamily = "";
    private String drugClass = "";
    private String resistanceMechanism = "";
    private String shortName = "";
    
    public CARDAccession() {
    }
    
    public void setName(String n) {
        name = n;
    }
    
    public String getName() {
        return name;        
    }
    
    public void setDescription(String d) {
        description = d;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setGeneFamily(String f) {
        geneFamily = f;
    }
    
    public String getGeneFamily() {
        return geneFamily;
    }
    
    public void setDrugClass(String c) {
        drugClass = c;
    }
    
    public String getDrugClass() {
        return drugClass;
    }
    
    public void setResistanceMechanism(String r) {
        resistanceMechanism = r;
    }
    
    public String getResistanceMechanism() {
        return resistanceMechanism;
    }
    
    public void setShortName(String n) {
        shortName = n;
    }
    
    public String getShortName() {
        return shortName;
    }
}
