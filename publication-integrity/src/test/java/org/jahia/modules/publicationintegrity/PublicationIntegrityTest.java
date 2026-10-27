package org.jahia.modules.publicationintegrity;

import java.lang.reflect.*;
import java.util.*;
import javax.jcr.*;
import org.junit.Test;
import static org.junit.Assert.*;

public class PublicationIntegrityTest {
    private static Calendar date(long time) { Calendar value=Calendar.getInstance();value.setTimeInMillis(time);return value; }
    @SuppressWarnings("unchecked")
    private static <T> T proxy(Class<T> type, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(),new Class<?>[]{type},handler);
    }
    private static Node node(Map<String,Object> values) {
        return proxy(Node.class,(self,method,args)->{
            if(method.getName().equals("hasProperty"))return values.containsKey(args[0]);
            if(method.getName().equals("setProperty")){values.put((String)args[0],args[1]);return null;}
            if(method.getName().equals("getProperty")) {
                Object value=values.get(args[0]);
                return proxy(Property.class,(p,m,a)->{
                    if(m.getName().equals("getDate")||m.getName().equals("getBoolean"))return value;
                    if(m.getName().equals("getValues"))return Arrays.stream((String[])value).map(v->proxy(Value.class,(vself,vm,va)->{if(vm.getName().equals("getString"))return v;throw new UnsupportedOperationException(vm.getName());})).toArray(Value[]::new);
                    throw new UnsupportedOperationException(m.getName());
                });
            }
            throw new UnsupportedOperationException(method.getName());
        });
    }
    private static void normalize(Map<String,Object> live,Map<String,Object> edit) throws Exception {
        Method method=PublicationIntegrity.class.getDeclaredMethod("normalize",Node.class,Node.class);
        method.setAccessible(true);method.invoke(null,node(live),node(edit));
    }
    @Test public void missingMarkersAndProtectedDatesAreRepairedWithoutPublishingTheDraft() throws Exception {
        Map<String,Object> live=new HashMap<>(),edit=new HashMap<>();
        live.put("jcr:lastModified",date(2000));live.put("j:lastPublished",date(1000));
        live.put("j:liveProperties",new String[]{"description","j:lastPublished","j:lastPublishedBy"});
        live.put("description","published");edit.put("description","unapproved draft");edit.put("j:lastPublished",date(500));
        normalize(live,edit);
        assertEquals("published",live.get("description"));assertEquals("unapproved draft",edit.get("description"));
        assertEquals(500,((Calendar)edit.get("j:lastPublished")).getTimeInMillis());
        assertEquals(2000,((Calendar)live.get("j:lastPublished")).getTimeInMillis());
        assertArrayEquals(new String[]{"description"},(String[])live.get("j:liveProperties"));
        assertEquals(true,live.get("j:published"));assertEquals(true,edit.get("j:published"));
        normalize(live,edit);assertEquals(500,((Calendar)edit.get("j:lastPublished")).getTimeInMillis());
    }
    @Test public void explicitUnpublicationInEitherWorkspaceIsNeverReversed() throws Exception {
        for(boolean liveFalse:new boolean[]{true,false}) {
            Map<String,Object> live=new HashMap<>(),edit=new HashMap<>();
            live.put("jcr:lastModified",date(2000));(liveFalse?live:edit).put("j:published",false);
            normalize(live,edit);
            assertFalse(live.containsKey("j:lastPublished"));assertFalse(edit.containsKey("j:lastPublished"));
            assertEquals(false,(liveFalse?live:edit).get("j:published"));
        }
    }
}
